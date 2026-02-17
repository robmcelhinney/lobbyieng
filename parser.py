import os
import glob
import csv
import json
import re
import sqlite3
import unicodedata
from collections import defaultdict, Counter
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# --- Config ---
DATA_FOLDER = "data"  # Folder containing CSV files.
DATABASE_URL = "sqlite:///lobbying.db"
DERIVED_FOLDER = os.path.join("data", "derived")
PRECOMPUTED_INSIGHTS_PATH = os.path.join(DERIVED_FOLDER, "explore_insights.json")

BANNED_NAMES = [
    "Skill Set Strategy Consultants", 
    "All Galway West and Galway East TD;s", 
    "All Public Representatives.",
    "All TDs",
    "ALL TDS of O.",
    "Dublin South West GE 2024 Candidates",
    "Members of Government",
    "Members of Oireachtas Committee on Children and Youth Affairs",
    "Members of Oireachtas Health Committee",
    "Skill Set has not engaged on behalf of clients in Ireland to date but will make a number of submissions in the near future in relation to EU Commission proposals.",
    "(Vacant)"
   ]

# Add a mapping of canonical names to their variants
NAME_CANONICALIZATION = {
    "Aengus Ó Snodaigh": [
        "Aengus Ó Snodaigh",
        "Aengus O Snoidigh",
        "aengus o'snodaigh"
    ],
    "Micheál Martin": [
        "Micheál Martin",
        "Michael Martin"
    ],
    "Ross Elwood": [
        "?Ross Elwood",
        "Ross Elwood",
    ],
    "Lucinda Creighton": [   
        "Lucinda Creighton (Please note that Lucinda Creighton was not a DPO during the return period 1 May - 31 Aug 2016)",
        "Lucinda Creighton (Please note that Lucinda Creighton was not a DPO during the return period 1 May - 31 Aug 2016)",
    ]
}

def to_ascii(name):
    name = name.replace("-", " ")  # Treat hyphens as spaces
    return ''.join(
        c for c in unicodedata.normalize('NFD', name)
        if unicodedata.category(c) != 'Mn'
    ).lower()

# Build a reverse lookup for fast normalization
NAME_VARIANT_TO_CANONICAL = {}
for canonical, variants in NAME_CANONICALIZATION.items():
    for v in variants:
        NAME_VARIANT_TO_CANONICAL[to_ascii(v)] = canonical

STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "into", "their", "about", "were", "was", "are", "has",
    "have", "had", "been", "will", "would", "could", "should", "its", "our", "out", "new", "all", "any", "can",
    "not", "who", "carried", "activity", "activities", "lobbying", "lobbied", "regarding", "relation", "related",
    "support", "policy", "programme", "public", "matter", "matters"
}

# --- Database Setup ---
Base = declarative_base()

class LobbyingRecord(Base):
    __tablename__ = "lobbying_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    csv_id = Column(String)
    url = Column(String, unique=True)
    lobbyist_name = Column(String)
    date_published = Column(DateTime)
    period = Column(String)
    relevant_matter = Column(String)
    public_policy_area = Column(String)
    specific_details = Column(Text)
    subject_matter = Column(String)
    intended_results = Column(Text)
    person_primary = Column(String)
    any_dpo_or_former_dpo = Column(Text)
    current_or_former_dpos = Column(Text)
    grassroots_campaign = Column(Boolean)
    grassroots_directive = Column(String)
    lobbying_on_behalf = Column(Boolean)
    clients = Column(Text)

    dpo_entries = relationship("DPOEntry", back_populates="lobbying_record", cascade="all, delete-orphan")
    activity_entries = relationship("LobbyingActivityEntry", back_populates="lobbying_record", cascade="all, delete-orphan")

class DPOEntry(Base):
    __tablename__ = "dpo_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    lobbying_record_id = Column(Integer, ForeignKey("lobbying_records.id"))
    person_name = Column(String)
    job_title = Column(String)
    public_body = Column(String)

    lobbying_record = relationship("LobbyingRecord", back_populates="dpo_entries")

class LobbyingActivityEntry(Base):
    __tablename__ = "lobbying_activity_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    lobbying_record_id = Column(Integer, ForeignKey("lobbying_records.id"))
    activity = Column(String)

    lobbying_record = relationship("LobbyingRecord", back_populates="activity_entries")

engine = create_engine(DATABASE_URL, echo=False)
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# --- Helper Functions ---
def safe_get(row, key):
    val = row.get(key)
    return (val if val is not None else "").strip()

def normalize_person_name(raw):
    name = raw.strip()
    if "," in name:
        name = name.split(",")[0].strip()
    if name.endswith(" TD"):
        name = name[:-3].strip()
    for prefix in ["Minister ", "Mr ", "Mr. ", "Dr ", "Ms ", "Dep "]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    name = name.strip()
    # Canonicalize if possible
    ascii_name = to_ascii(name)
    if ascii_name in NAME_VARIANT_TO_CANONICAL:
        return NAME_VARIANT_TO_CANONICAL[ascii_name]
    return name

def slugify(value):
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")

def normalize_token(raw):
    lowered = unicodedata.normalize("NFD", str(raw or ""))
    lowered = "".join(ch for ch in lowered if unicodedata.category(ch) != "Mn")
    lowered = re.sub(r"[^a-z0-9]", "", lowered.lower())
    if len(lowered) < 3 or lowered.isdigit() or lowered in STOPWORDS:
        return ""
    stem = lowered
    if stem.endswith("ies") and len(stem) > 4:
        stem = f"{stem[:-3]}y"
    elif stem.endswith("ing") and len(stem) > 5:
        stem = stem[:-3]
    elif stem.endswith("ed") and len(stem) > 4:
        stem = stem[:-2]
    elif stem.endswith("es") and len(stem) > 4:
        stem = stem[:-2]
    elif stem.endswith("s") and len(stem) > 3:
        stem = stem[:-1]
    return stem if len(stem) >= 3 else ""

def biggest_movers(current_rows, previous_rows):
    merged = {}
    for row in previous_rows:
        merged[row["name"]] = {"name": row["name"], "previous": row["contact_count"], "current": 0}
    for row in current_rows:
        existing = merged.get(row["name"], {"name": row["name"], "previous": 0, "current": 0})
        existing["current"] = row["contact_count"]
        merged[row["name"]] = existing
    result = []
    for row in merged.values():
        delta = row["current"] - row["previous"]
        if delta == 0:
            continue
        result.append({
            "name": row["name"],
            "previous": row["previous"],
            "current": row["current"],
            "delta": delta,
            "slug": slugify(row["name"])
        })
    result.sort(key=lambda r: (-r["delta"], -r["current"], r["name"]))
    return result[:20]

def rows_with_slug(rows):
    return [{**row, "slug": slugify(row["name"])} for row in rows]

def build_explore_precomputed():
    conn = sqlite3.connect("lobbying.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        periods = cur.execute(
            """
            SELECT period, MAX(date_published) AS latest_date
            FROM lobbying_records
            WHERE period IS NOT NULL AND TRIM(period) != ''
            GROUP BY period
            ORDER BY latest_date DESC
            """
        ).fetchall()

        latest_period = periods[0]["period"] if periods else None
        previous_period = periods[1]["period"] if len(periods) > 1 else None

        def fetch_rows(query, params=()):
            return [dict(r) for r in cur.execute(query, params).fetchall()]

        top_targets_latest = fetch_rows(
            """
            SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM dpo_entries dpo
            JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
            WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
            GROUP BY dpo.person_name
            ORDER BY contact_count DESC, dpo.person_name ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        top_targets_last_year = fetch_rows(
            """
            SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM dpo_entries dpo
            JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
            WHERE lr.date_published >= datetime('now', '-1 year')
              AND dpo.person_name IS NOT NULL
              AND TRIM(dpo.person_name) != ''
            GROUP BY dpo.person_name
            ORDER BY contact_count DESC, dpo.person_name ASC
            LIMIT 20
            """
        )

        top_lobbyists_latest = fetch_rows(
            """
            SELECT
              lr.lobbyist_name AS name,
              COUNT(DISTINCT lr.id) AS return_count,
              COUNT(DISTINCT dpo.person_name) AS unique_targets
            FROM lobbying_records lr
            LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            GROUP BY lr.lobbyist_name
            ORDER BY return_count DESC, unique_targets DESC, lr.lobbyist_name ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        most_active_lobbyists = fetch_rows(
            """
            SELECT
              lr.lobbyist_name AS name,
              COUNT(DISTINCT lr.id) AS return_count,
              COUNT(DISTINCT dpo.person_name) AS unique_targets
            FROM lobbying_records lr
            LEFT JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
            WHERE lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            GROUP BY lr.lobbyist_name
            ORDER BY return_count DESC, unique_targets DESC, lr.lobbyist_name ASC
            LIMIT 20
            """
        )

        current_official_counts = fetch_rows(
            """
            SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM dpo_entries dpo
            JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
            WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
            GROUP BY dpo.person_name
            """,
            (latest_period,),
        ) if latest_period else []

        previous_official_counts = fetch_rows(
            """
            SELECT dpo.person_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM dpo_entries dpo
            JOIN lobbying_records lr ON lr.id = dpo.lobbying_record_id
            WHERE lr.period = ? AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
            GROUP BY dpo.person_name
            """,
            (previous_period,),
        ) if previous_period else []

        current_lobbyist_counts = fetch_rows(
            """
            SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM lobbying_records lr
            WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            GROUP BY lr.lobbyist_name
            """,
            (latest_period,),
        ) if latest_period else []

        previous_lobbyist_counts = fetch_rows(
            """
            SELECT lr.lobbyist_name AS name, COUNT(DISTINCT lr.id) AS contact_count
            FROM lobbying_records lr
            WHERE lr.period = ? AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            GROUP BY lr.lobbyist_name
            """,
            (previous_period,),
        ) if previous_period else []

        top_policy_areas_latest = fetch_rows(
            """
            SELECT public_policy_area AS name, COUNT(*) AS return_count
            FROM lobbying_records
            WHERE period = ? AND public_policy_area IS NOT NULL AND TRIM(public_policy_area) != ''
            GROUP BY public_policy_area
            ORDER BY return_count DESC, public_policy_area ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        keyword_rows = fetch_rows(
            """
            SELECT
              COALESCE(subject_matter, '') AS subject_matter,
              COALESCE(intended_results, '') AS intended_results,
              COALESCE(specific_details, '') AS specific_details,
              COALESCE(relevant_matter, '') AS relevant_matter
            FROM lobbying_records
            WHERE period = ?
            """,
            (latest_period,),
        ) if latest_period else []

        keyword_counts = Counter()
        for row in keyword_rows:
            text_blob = " ".join([
                row.get("subject_matter", ""),
                row.get("intended_results", ""),
                row.get("specific_details", ""),
                row.get("relevant_matter", ""),
            ])
            for raw in text_blob.split():
                token = normalize_token(raw)
                if token:
                    keyword_counts[token] += 1

        top_keywords_latest = [
            {"token": token, "count": count}
            for token, count in sorted(keyword_counts.items(), key=lambda x: (-x[1], x[0]))[:30]
        ]

        official_centrality_latest = fetch_rows(
            """
            WITH edges AS (
              SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
              FROM lobbying_records lr
              JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
              WHERE lr.period = ?
                AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
                AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            )
            SELECT official AS name, COUNT(DISTINCT lobbyist) AS degree
            FROM edges
            GROUP BY official
            ORDER BY degree DESC, official ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        lobbyist_centrality_latest = fetch_rows(
            """
            WITH edges AS (
              SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
              FROM lobbying_records lr
              JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
              WHERE lr.period = ?
                AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
                AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            )
            SELECT lobbyist AS name, COUNT(DISTINCT official) AS degree
            FROM edges
            GROUP BY lobbyist
            ORDER BY degree DESC, lobbyist ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        shared_lobbyists_latest = fetch_rows(
            """
            WITH edges AS (
              SELECT DISTINCT dpo.person_name AS official, lr.lobbyist_name AS lobbyist
              FROM lobbying_records lr
              JOIN dpo_entries dpo ON dpo.lobbying_record_id = lr.id
              WHERE lr.period = ?
                AND dpo.person_name IS NOT NULL AND TRIM(dpo.person_name) != ''
                AND lr.lobbyist_name IS NOT NULL AND TRIM(lr.lobbyist_name) != ''
            )
            SELECT
              e1.official AS official_a,
              e2.official AS official_b,
              COUNT(*) AS shared_lobbyists
            FROM edges e1
            JOIN edges e2
              ON e1.lobbyist = e2.lobbyist
             AND e1.official < e2.official
            GROUP BY e1.official, e2.official
            ORDER BY shared_lobbyists DESC, e1.official ASC, e2.official ASC
            LIMIT 20
            """,
            (latest_period,),
        ) if latest_period else []

        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "latest_period": latest_period,
            "previous_period": previous_period,
            "top_targets_latest": rows_with_slug(top_targets_latest),
            "top_targets_last_year": rows_with_slug(top_targets_last_year),
            "top_lobbyists_latest": rows_with_slug(top_lobbyists_latest),
            "most_active_lobbyists": rows_with_slug(most_active_lobbyists),
            "biggest_mover_officials": biggest_movers(current_official_counts, previous_official_counts),
            "biggest_mover_lobbyists": biggest_movers(current_lobbyist_counts, previous_lobbyist_counts),
            "top_policy_areas_latest": top_policy_areas_latest,
            "top_keywords_latest": top_keywords_latest,
            "official_centrality_latest": rows_with_slug(official_centrality_latest),
            "lobbyist_centrality_latest": rows_with_slug(lobbyist_centrality_latest),
            "shared_lobbyists_latest": [
                {
                    **row,
                    "official_a_slug": slugify(row["official_a"]),
                    "official_b_slug": slugify(row["official_b"])
                }
                for row in shared_lobbyists_latest
            ],
            "search_term": "",
            "search_results": []
        }

        os.makedirs(DERIVED_FOLDER, exist_ok=True)
        with open(PRECOMPUTED_INSIGHTS_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        print(f"Wrote precomputed insights: {PRECOMPUTED_INSIGHTS_PATH}")
    finally:
        conn.close()

# --- Data Extraction & Normalization ---
def fetch_and_parse_csv_from_file(file_path):
    records = []
    with open(file_path, mode="r", encoding="utf-8-sig") as file:
        csv_text = file.read().replace('\x00', '')
        print(f"Processing file: {file_path}")
        print("CSV Preview (first 300 chars):")
        print(csv_text[:300])
        lines = csv_text.splitlines()
        if not lines:
            print("No lines found in CSV!")
            return []
        print("CSV Header:", lines[0])
        reader = csv.DictReader(lines, delimiter=",")
        row_count = 0
        for row in reader:
            row_count += 1
            url_val = safe_get(row, "Url")
            if not url_val:
                continue
            date_str = safe_get(row, "Date Published")
            published_date = None
            if date_str:
                try:
                    published_date = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
                except ValueError:
                    published_date = None

            record = {
                "csv_id": safe_get(row, "Id"),
                "url": url_val,
                "lobbyist_name": safe_get(row, "Lobbyist Name"),
                "date_published": published_date,
                "period": safe_get(row, "Period"),
                "relevant_matter": safe_get(row, "Relevant Matter"),
                "public_policy_area": safe_get(row, "Public Policy Area"),
                "specific_details": safe_get(row, "Specific Details"),
                "dpos_lobbied": safe_get(row, "DPOs Lobbied"),
                "subject_matter": safe_get(row, "Subject Matter"),
                "intended_results": safe_get(row, "Intended Results"),
                "lobbying_activities": safe_get(row, "Lobbying Activities"),
                "person_primary": safe_get(row, "Person primarily responsible for lobbying on this activity"),
                "any_dpo_or_former_dpo": safe_get(row, "Any DPOs or Former DPOs who carried out lobbying activities"),
                "current_or_former_dpos": safe_get(row, "Current or Former DPOs"),
                "grassroots_campaign": safe_get(row, "Was this a grassroots campaign?").lower() in ('true', 'yes', '1'),
                "grassroots_directive": safe_get(row, "Grassroots directive"),
                "lobbying_on_behalf": safe_get(row, "Was this lobbying done on behalf of a client?").lower() in ('true', 'yes', '1'),
                "clients": safe_get(row, "Client(s)"),
            }
            records.append(record)
        print(f"Processed {row_count} rows, extracted {len(records)} valid records from {file_path}.")
    return records

def fetch_all_csv_records(folder):
    all_records = []
    csv_files = glob.glob(os.path.join(folder, "*.csv"))
    for file_path in csv_files:
        recs = fetch_and_parse_csv_from_file(file_path)
        all_records.extend(recs)
    return all_records

# --- Database Integration ---
def insert_records(records):
    session = Session()
    inserted = 0
    name_variants = defaultdict(list)

    for record in records:
        exists = session.query(LobbyingRecord).filter_by(url=record["url"]).first()
        if exists:
            continue

        new_record = LobbyingRecord(
            csv_id=record["csv_id"],
            url=record["url"],
            lobbyist_name=record["lobbyist_name"],
            date_published=record["date_published"],
            period=record["period"],
            relevant_matter=record["relevant_matter"],
            public_policy_area=record["public_policy_area"],
            specific_details=record["specific_details"],
            subject_matter=record["subject_matter"],
            intended_results=record["intended_results"],
            person_primary=record["person_primary"],
            any_dpo_or_former_dpo=record["any_dpo_or_former_dpo"],
            current_or_former_dpos=record["current_or_former_dpos"],
            grassroots_campaign=record["grassroots_campaign"],
            grassroots_directive=record["grassroots_directive"],
            lobbying_on_behalf=record["lobbying_on_behalf"],
            clients=record["clients"],
        )
        session.add(new_record)
        session.flush()

        dpo_str = record.get("dpos_lobbied", "")
        if dpo_str:
            dpo_entries = [entry.strip() for entry in dpo_str.split("::") if entry.strip()]
            for entry in dpo_entries:
                parts = [part.strip() for part in entry.split("|")]
                if len(parts) >= 3:
                    raw_name = parts[0]
                    norm_name = normalize_person_name(raw_name)
                    if norm_name in BANNED_NAMES:
                        continue  # Skip banned names
                    ascii = to_ascii(norm_name)
                    name_variants[ascii].append(norm_name)
                    dpo = DPOEntry(
                        lobbying_record_id=new_record.id,
                        person_name=norm_name,
                        job_title=parts[1],
                        public_body=parts[2]
                    )
                    session.add(dpo)

        activity_str = record.get("lobbying_activities", "")
        if activity_str:
            activity_entries = [entry.strip() for entry in activity_str.split("::") if entry.strip()]
            for act in activity_entries:
                activity_entry = LobbyingActivityEntry(
                    lobbying_record_id=new_record.id,
                    activity=act
                )
                session.add(activity_entry)

        inserted += 1

    # Deduplicate by most common variant (with preference for capitalized names)
    replacements = {}
    for ascii_key, variants in name_variants.items():
        count = Counter(variants)
        sorted_variants = sorted(count.items(), key=lambda x: (-x[1], x[0].lower(), x[0]))
        preferred = sorted([v[0] for v in sorted_variants if any(w[0].isupper() for w in v[0].split())], key=lambda x: -count[x])
        replacements[ascii_key] = preferred[0] if preferred else sorted_variants[0][0]

    for dpo in session.query(DPOEntry).all():
        ascii = to_ascii(dpo.person_name)
        if ascii in replacements:
            dpo.person_name = replacements[ascii]

    session.commit()
    session.close()
    return inserted

def run_pipeline():
    records = fetch_all_csv_records(DATA_FOLDER)
    if records:
        new_inserts = insert_records(records)
        print(f"Inserted {new_inserts} new records (out of {len(records)} parsed records).")
    else:
        print("No records found.")

if __name__ == "__main__":
    run_pipeline()
    with engine.connect() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dpo_person_name ON dpo_entries(person_name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dpo_person_name_record ON dpo_entries(person_name, lobbying_record_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dpo_lobbying_record_id ON dpo_entries(lobbying_record_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_period ON lobbying_records(period)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_lobbyist_name ON lobbying_records(lobbyist_name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_period_date ON lobbying_records(period, date_published)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_lobbyist_period_date ON lobbying_records(lobbyist_name, period, date_published)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_lobbying_record_id ON lobbying_activity_entries(lobbying_record_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_record_activity ON lobbying_activity_entries(lobbying_record_id, activity)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_date_published ON lobbying_records(date_published)"))
    build_explore_precomputed()
