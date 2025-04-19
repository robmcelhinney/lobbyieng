import sqlite3 from "sqlite3";
import { open } from "sqlite";

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]+/gu, "-") // Replace non-alphanumeric (unicode) with dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .toLowerCase();
}

export default async function handler(req, res) {
  try {
    const { slug, page = 1, official, year, method } = req.query;
    const PER_PAGE = 10;
    const offset = (page - 1) * PER_PAGE;

    const db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database,
    });

    // Resolve canonical lobbyist name from lobbying_records.
    const rows = await db.all(
      `SELECT DISTINCT lobbyist_name FROM lobbying_records`,
    );
    let canonical = null;
    for (const row of rows) {
      if (slugify(row.lobbyist_name) === slug) {
        canonical = row.lobbyist_name;
        break;
      }
    }
    if (!canonical) {
      return res.status(404).json({ error: "Lobbyist not found" });
    }

    // Build filtering conditions for official, year, and method.
    let filterConditions = "";
    const filterParams = [];
    if (official) {
      filterConditions +=
        " AND EXISTS (SELECT 1 FROM dpo_entries dpo WHERE dpo.lobbying_record_id = lr.id AND LOWER(dpo.person_name) = ?) ";
      filterParams.push(official.toLowerCase());
    }
    if (year) {
      filterConditions += " AND strftime('%Y', lr.date_published) = ? ";
      filterParams.push(year);
    }
    // Accept method as array for multi-select (OR logic)
    let methodFilters = [];
    if (Array.isArray(method)) {
      methodFilters = method;
    } else if (typeof method === "string" && method) {
      methodFilters = [method];
    }
    if (methodFilters.length > 0) {
      if (typeof method === "string" && method.includes(",")) {
        methodFilters = method.split(",").map((s) => s.trim());
      }
      filterConditions +=
        `\n        AND EXISTS (\n          SELECT 1 FROM lobbying_activity_entries lae\n          WHERE lae.lobbying_record_id = lr.id\n            AND ( ` +
        methodFilters.map(() => `LOWER(lae.activity) LIKE ?`).join(" OR ") +
        ` )\n        )\n      `;
      methodFilters.forEach((m) =>
        filterParams.push("%" + m.toLowerCase() + "%"),
      );
    }

    // Query total count using the filters.
    const countQuery = `
      SELECT COUNT(DISTINCT lr.id) AS total
      FROM lobbying_records lr
      WHERE LOWER(lr.lobbyist_name) = ?
        AND lr.intended_results IS NOT NULL AND TRIM(lr.intended_results) != ''
      ${filterConditions}
    `;
    const countRow = await db.get(countQuery, [
      canonical.toLowerCase(),
      ...filterParams,
    ]);
    const total = countRow?.total || 0;

    // Query paginated records with filters.
    const baseQuery = `
      SELECT lr.*, lr.any_dpo_or_former_dpo,
        (
          SELECT GROUP_CONCAT(dpo.person_name || '|' || dpo.job_title || '|' || dpo.public_body, '||')
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
        ) AS dpos,
        (
          SELECT GROUP_CONCAT(activity, '||')
          FROM lobbying_activity_entries
          WHERE lobbying_record_id = lr.id
        ) AS activities
      FROM lobbying_records lr
      WHERE LOWER(lr.lobbyist_name) = ?
        AND lr.intended_results IS NOT NULL AND TRIM(lr.intended_results) != ''
      ${filterConditions}
      ORDER BY lr.date_published DESC
      LIMIT ? OFFSET ?
    `;

    const records = await db.all(baseQuery, [
      canonical.toLowerCase(),
      ...filterParams,
      PER_PAGE,
      offset,
    ]);
    // Use any_dpo_or_former_dpo to set isFormerDPO
    const parsedRecords = records.map((r) => {
      let dpo_entries = [];
      if (typeof r.dpos === "string") {
        dpo_entries = r.dpos.split("||").map((entry) => {
          const [name, job, body] = entry.split("|");
          return {
            person_name: name,
            job_title: job,
            public_body: body,
          };
        });
      }
      return {
        id: r.id,
        url: r.url,
        lobbyist_name: r.lobbyist_name,
        date_published: r.date_published,
        specific_details: r.specific_details?.slice(0, 1000),
        intended_results: r.intended_results?.slice(0, 1000),
        isFormerDPO: r.any_dpo_or_former_dpo === "Yes",
        dpo_entries,
        lobbying_activities:
          typeof r.activities === "string"
            ? r.activities
                .split("||")
                .map((entry) => entry.trim())
                .filter(Boolean)
            : [],
      };
    });

    // Retrieve all records (unpaginated) to compute unique filter options.
    const allRecordsQuery = `
      SELECT lr.*,
        (
          SELECT GROUP_CONCAT(dpo.person_name || '|' || dpo.job_title || '|' || dpo.public_body, '||')
          FROM dpo_entries dpo
          WHERE dpo.lobbying_record_id = lr.id
        ) AS dpos,
        (
          SELECT GROUP_CONCAT(activity, '||')
          FROM lobbying_activity_entries
          WHERE lobbying_record_id = lr.id
        ) AS activities
      FROM lobbying_records lr
      WHERE LOWER(lr.lobbyist_name) = ?
        AND lr.intended_results IS NOT NULL AND TRIM(lr.intended_results) != ''
    `;
    const allRaw = await db.all(allRecordsQuery, [canonical.toLowerCase()]);
    const allRecords = allRaw.map((r) => ({
      dpo_entries:
        typeof r.dpos === "string"
          ? r.dpos.split("||").map((entry) => {
              const [name] = entry.split("|");
              return name;
            })
          : [],
      date_published: r.date_published,
      lobbying_activities:
        typeof r.activities === "string"
          ? r.activities
              .split("||")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [],
    }));

    // Compute unique filter options.
    // For methods, extract from activities (between pipes) and from specific_details (second field)
    const methodSet = new Set();
    allRaw.forEach((r) => {
      // Parse methods from activities
      if (typeof r.activities === "string") {
        r.activities.split("||").forEach((act) => {
          const parts = act.split("|");
          if (parts.length > 1 && parts[1].trim()) {
            methodSet.add(parts[1].trim());
          }
        });
      }
      // Parse methods from specific_details
      if (r.specific_details) {
        r.specific_details.split(/,(?![^|]*\|)/).forEach((entry) => {
          const parts = entry.split("|").map((s) => s.trim());
          if (parts[1]) methodSet.add(parts[1]);
        });
      }
    });
    const uniqueMethods = Array.from(methodSet).filter(Boolean).sort();

    const uniqueOfficials = Array.from(
      new Set(allRecords.flatMap((r) => r.dpo_entries).filter(Boolean)),
    ).sort();
    const uniqueYears = Array.from(
      new Set(
        allRecords
          .map((r) => new Date(r.date_published).getFullYear().toString())
          .filter(Boolean),
      ),
    ).sort((a, b) => b - a);

    res.status(200).json({
      name: canonical,
      slug: slugify(canonical),
      total,
      page: parseInt(page),
      pageSize: PER_PAGE,
      records: parsedRecords,
      officials: uniqueOfficials,
      years: uniqueYears,
      methods: uniqueMethods,
      currentFilters: {
        officialFilter: official || "",
        yearFilter: year || "",
        methodFilter: method || "",
      },
    });
  } catch (err) {
    console.error("Error in lobbyist detail API:", err);
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}
