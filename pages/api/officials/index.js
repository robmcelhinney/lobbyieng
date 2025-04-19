import sqlite3 from "sqlite3";
import { open } from "sqlite";

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: "./lobbying.db",
      driver: sqlite3.Database,
    });

    const { period, job_titles } = req.query;
    // Parse job_titles from comma-separated string to array
    let allowedJobTitles = null;
    if (job_titles) {
      allowedJobTitles = job_titles.split(",").map((t) => t.trim());
    }
    let jobTitleCondition = "";
    if (allowedJobTitles && allowedJobTitles.length > 0) {
      jobTitleCondition = ` AND dpo.job_title IN (${allowedJobTitles
        .map(() => "?")
        .join(",")}) `;
    }
    let rows;
    if (period && period !== "All") {
      // Filter by period and job_title
      rows = await db.all(
        `
                SELECT person_name, job_title, lr.period
                FROM dpo_entries dpo
                JOIN lobbying_records lr ON dpo.lobbying_record_id = lr.id
                WHERE person_name IS NOT NULL AND TRIM(person_name) != ''
                  AND lr.period = ?
                  ${jobTitleCondition}
            `,
        [period, ...(allowedJobTitles || [])],
      );
    } else {
      // Get most recent period/job_title per person_name using SQL (fixed with CTE)
      rows = await db.all(
        `
                WITH ranked AS (
                  SELECT
                    dpo.person_name,
                    dpo.job_title,
                    lr.period,
                    CAST(substr(lr.period, 8, 4) AS INTEGER) AS year,
                    CASE substr(lr.period, 4, 3)
                      WHEN 'Jan' THEN 1
                      WHEN 'Feb' THEN 2
                      WHEN 'Mar' THEN 3
                      WHEN 'Apr' THEN 4
                      WHEN 'May' THEN 5
                      WHEN 'Jun' THEN 6
                      WHEN 'Jul' THEN 7
                      WHEN 'Aug' THEN 8
                      WHEN 'Sep' THEN 9
                      WHEN 'Oct' THEN 10
                      WHEN 'Nov' THEN 11
                      WHEN 'Dec' THEN 12
                      ELSE 0
                    END AS month,
                    ROW_NUMBER() OVER (
                      PARTITION BY dpo.person_name
                      ORDER BY CAST(substr(lr.period, 8, 4) AS INTEGER) DESC,
                               CASE substr(lr.period, 4, 3)
                                 WHEN 'Jan' THEN 1
                                 WHEN 'Feb' THEN 2
                                 WHEN 'Mar' THEN 3
                                 WHEN 'Apr' THEN 4
                                 WHEN 'May' THEN 5
                                 WHEN 'Jun' THEN 6
                                 WHEN 'Jul' THEN 7
                                 WHEN 'Aug' THEN 8
                                 WHEN 'Sep' THEN 9
                                 WHEN 'Oct' THEN 10
                                 WHEN 'Nov' THEN 11
                                 WHEN 'Dec' THEN 12
                                 ELSE 0
                               END DESC
                    ) AS rn
                  FROM dpo_entries dpo
                  JOIN lobbying_records lr ON dpo.lobbying_record_id = lr.id
                  WHERE dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
                  ${jobTitleCondition}
                )
                SELECT person_name, job_title, period
                FROM ranked
                WHERE rn = 1
            `,
        allowedJobTitles || [],
      );
    }

    const nameMap = new Map();
    for (const row of rows) {
      const ascii = row.person_name
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      if (!nameMap.has(ascii)) nameMap.set(ascii, []);
      nameMap.get(ascii).push({
        name: row.person_name,
        job_title: row.job_title,
        period: row.period,
      });
    }

    let officials;
    if (period && period !== "All") {
      // For a specific period, return all officials for that period
      officials = Array.from(nameMap.values()).map((variants) => {
        const v = variants[0];
        return {
          name: v.name,
          slug: slugify(v.name),
          job_title: v.job_title,
          periods: [v.period],
        };
      });
    } else {
      // For 'All', return one entry per person with most recent period/job_title
      officials = Array.from(nameMap.values()).map((variants) => {
        // Choose the record with the latest period (sort by year/month)
        const best = variants.reduce((acc, cur) => {
          // Extract year and month from period string
          const extract = (p) => {
            const m = p.period.match(/(\d{1,2}) (\w+), (\d{4})/);
            if (!m) return { year: 0, month: 0 };
            const year = parseInt(m[3], 10);
            const monthNames = [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ];
            const month = monthNames.indexOf(m[2]) + 1;
            return { year, month };
          };
          const a = extract(acc);
          const c = extract(cur);
          if (c.year > a.year) return cur;
          if (c.year === a.year && c.month > a.month) return cur;
          return acc;
        });
        return {
          name: best.name,
          slug: slugify(best.name),
          job_title: best.job_title,
          periods: Array.from(
            new Set(variants.map((v) => v.period).filter(Boolean)),
          ),
        };
      });
    }

    officials = officials
      .filter((off) => off && off.slug)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=60",
    );
    res.status(200).json(officials);
  } catch (err) {
    console.error("Error in officials index API:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
