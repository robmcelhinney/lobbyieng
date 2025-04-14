import os
import glob
import csv
import unicodedata
from collections import defaultdict, Counter
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# --- Config ---
DATA_FOLDER = "data"  # Folder containing CSV files.
DATABASE_URL = "sqlite:///lobbying.db"

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

engine = create_engine(DATABASE_URL, echo=True)
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
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dpo_lobbying_record_id ON dpo_entries(lobbying_record_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_lobbying_record_id ON lobbying_activity_entries(lobbying_record_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_lr_date_published ON lobbying_records(date_published)"))
