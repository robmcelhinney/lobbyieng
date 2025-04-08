import csv
import requests
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# --- Config ---
CSV_URL = (
    "https://api.lobbying.ie/api/ExportReturns/Csv?"
    "currentPage=0&pageSize=129&queryText=&subjectMatters=&subjectMatterAreas=&publicBodys=&jobTitles=12&"
    "returnDateFrom=01-01-2025&returnDateTo=07-04-2025&period=&dpo=&client=&responsible=&lobbyist=&lobbyistId="
)
DATABASE_URL = "sqlite:///lobbying.db"

# --- Database Setup ---
Base = declarative_base()

class LobbyingRecord(Base):
    __tablename__ = "lobbying_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    csv_id = Column(String)                         # "Id"
    url = Column(String, unique=True)               # "Url"
    lobbyist_name = Column(String)                  # "Lobbyist Name"
    date_published = Column(DateTime)               # "Date Published"
    period = Column(String)                         # "Period"
    relevant_matter = Column(String)                # "Relevant Matter"
    public_policy_area = Column(String)             # "Public Policy Area"
    specific_details = Column(Text)                 # "Specific Details"
    dpos_lobbied = Column(Text)                     # "DPOs Lobbied"
    subject_matter = Column(String)                 # "Subject Matter"
    intended_results = Column(Text)                 # "Intended Results"
    lobbying_activities = Column(Text)              # "Lobbying Activities"
    person_primary = Column(String)                 # "Person primarily responsible for lobbying on this activity"
    any_dpo_or_former_dpo = Column(Text)            # "Any DPOs or Former DPOs who carried out lobbying activities"
    current_or_former_dpos = Column(Text)           # "Current or Former DPOs"
    grassroots_campaign = Column(Boolean)           # "Was this a grassroots campaign?"
    grassroots_directive = Column(String)           # "Grassroots directive"
    lobbying_on_behalf = Column(Boolean)            # "Was this lobbying done on behalf of a client?"
    clients = Column(Text)                          # "Client(s)"

engine = create_engine(DATABASE_URL, echo=True)
# Drop existing tables to apply the updated schema (remove for production)
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

# --- Data Extraction & Normalization ---
def fetch_and_parse_csv(url):
    response = requests.get(url)
    response.encoding = 'utf-8-sig'  # Handles BOM if present
    csv_text = response.text

    # Debug: preview CSV content
    print("CSV Preview (first 300 chars):")
    print(csv_text[:300])
    
    # Split into lines
    lines = csv_text.splitlines()
    if not lines:
        print("No lines found in CSV!")
        return []
    
    # Debug: print header row
    print("CSV Header:", lines[0])
    
    # Use comma as delimiter
    reader = csv.DictReader(lines, delimiter=",")
    records = []
    row_count = 0
    for row in reader:
        row_count += 1
        # Skip records with empty URL – the unique key.
        url_val = row.get("Url", "").strip()
        if not url_val:
            continue

        # Parse date; expected format "18/01/2025 17:32"
        date_str = row.get("Date Published", "").strip()
        published_date = None
        if date_str:
            try:
                published_date = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            except ValueError:
                published_date = None

        # Helper to convert boolean fields
        def parse_bool(val):
            return str(val).strip().lower() in ('true', 'yes', '1')

        record = {
            "csv_id": row.get("Id", "").strip(),
            "url": url_val,
            "lobbyist_name": row.get("Lobbyist Name", "").strip(),
            "date_published": published_date,
            "period": row.get("Period", "").strip(),
            "relevant_matter": row.get("Relevant Matter", "").strip(),
            "public_policy_area": row.get("Public Policy Area", "").strip(),
            "specific_details": row.get("Specific Details", "").strip(),
            "dpos_lobbied": row.get("DPOs Lobbied", "").strip(),
            "subject_matter": row.get("Subject Matter", "").strip(),
            "intended_results": row.get("Intended Results", "").strip(),
            "lobbying_activities": row.get("Lobbying Activities", "").strip(),
            "person_primary": row.get("Person primarily responsible for lobbying on this activity", "").strip(),
            "any_dpo_or_former_dpo": row.get("Any DPOs or Former DPOs who carried out lobbying activities", "").strip(),
            "current_or_former_dpos": row.get("Current or Former DPOs", "").strip(),
            "grassroots_campaign": parse_bool(row.get("Was this a grassroots campaign?", "")),
            "grassroots_directive": row.get("Grassroots directive", "").strip(),
            "lobbying_on_behalf": parse_bool(row.get("Was this lobbying done on behalf of a client?", "")),
            "clients": row.get("Client(s)", "").strip(),
        }
        records.append(record)
    
    print(f"Processed {row_count} rows, extracted {len(records)} valid records.")
    return records

# --- Database Integration ---
def insert_records(records):
    session = Session()
    for record in records:
        # Skip insertion if URL already exists.
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
            dpos_lobbied=record["dpos_lobbied"],
            subject_matter=record["subject_matter"],
            intended_results=record["intended_results"],
            lobbying_activities=record["lobbying_activities"],
            person_primary=record["person_primary"],
            any_dpo_or_former_dpo=record["any_dpo_or_former_dpo"],
            current_or_former_dpos=record["current_or_former_dpos"],
            grassroots_campaign=record["grassroots_campaign"],
            grassroots_directive=record["grassroots_directive"],
            lobbying_on_behalf=record["lobbying_on_behalf"],
            clients=record["clients"],
        )
        session.add(new_record)
    session.commit()
    session.close()

# --- Main Pipeline ---
def run_pipeline():
    records = fetch_and_parse_csv(CSV_URL)
    if records:
        insert_records(records)
        print(f"Inserted {len(records)} records.")
    else:
        print("No records found.")

if __name__ == "__main__":
    run_pipeline()
