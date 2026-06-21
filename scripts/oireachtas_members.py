import json
import re
import unicodedata
from collections import Counter
from html import unescape
from pathlib import Path
import subprocess
from urllib.parse import urljoin

import requests

BASE_URL = "https://www.oireachtas.ie"
API_BASE = "https://api.oireachtas.ie/v1"
REQUEST_TIMEOUT = (10, 30)
ROSTER_PATH = Path("data/derived/current_oireachtas_members.json")

DIRECTORIES = {
    "dail": {
        "directory_url": f"{BASE_URL}/en/members/tds/",
        "chamber": "dail",
    },
    "seanad": {
        "directory_url": f"{BASE_URL}/en/members/senators/",
        "chamber": "seanad",
    },
}


def slugify(value):
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower().strip()
    return re.sub(r"\s+", "-", value)


def clean_text(value):
    return re.sub(r"\s+", " ", unescape(str(value or ""))).strip()


def fetch_html(url):
    result = subprocess.run(
        ["curl", "-L", "-s", "--max-time", "20", url],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def discover_date_start(chamber):
    directory_html = fetch_html(DIRECTORIES[chamber]["directory_url"])
    dates = re.findall(r"\.(\d{4}-\d{2}-\d{2})/", directory_html)
    if not dates:
        return None
    return Counter(dates).most_common(1)[0][0]


def fetch_current_members_for_chamber(chamber):
    date_start = discover_date_start(chamber)
    if not date_start:
        return []

    api_url = f"{API_BASE}/members"
    head_response = requests.get(
        api_url,
        params={"date_start": date_start, "chamber": chamber, "limit": 1, "skip": 0},
        timeout=REQUEST_TIMEOUT,
    )
    head_response.raise_for_status()
    total = head_response.json()["head"]["counts"]["memberCount"]

    members = []
    for skip in range(0, total, 200):
        response = requests.get(
            api_url,
            params={"date_start": date_start, "chamber": chamber, "limit": 200, "skip": skip},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        for rec in results:
            member = rec.get("member", {})
            member_code = member.get("memberCode") or ""
            name = clean_text(member.get("fullName") or member.get("showAs") or "")
            if not name or not member_code:
                continue
            member_url = urljoin(BASE_URL, f"/en/members/member/{member_code}/")
            image_url = f"{member.get('uri', '').rstrip('/')}/image/large" if member.get("uri") else ""
            members.append(
                {
                    "name": name,
                    "slug": slugify(name),
                    "chamber": chamber,
                    "member_url": member_url,
                    "image_url": image_url,
                    "image_alt": name,
                }
            )
    return members


def _parse_profile_contacts(html):
    emails = sorted(set(re.findall(r'href="mailto:([^"]+)"', html, flags=re.IGNORECASE)))
    social_links = []
    for match in re.finditer(
        r'<li class="c-member-about__web-item">.*?<img[^>]+alt="([^"]+)".*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        label = clean_text(match.group(1))
        url = clean_text(match.group(2))
        text = clean_text(match.group(3))
        if url:
            social_links.append(
                {
                    "label": label,
                    "text": text or label,
                    "url": url,
                }
            )

    phones = []
    phone_block = re.search(r'<ul class="c-member-about__phone-numbers">(.*?)</ul>', html, flags=re.IGNORECASE | re.DOTALL)
    if phone_block:
        for phone in re.findall(r'<li class="c-member-about__phone">.*?<p[^>]*>(.*?)</p>', phone_block.group(1), flags=re.IGNORECASE | re.DOTALL):
            cleaned = clean_text(re.sub(r"<[^>]+>", " ", phone))
            if cleaned:
                phones.append(cleaned)

    return {
        "emails": emails,
        "phones": phones,
        "social_links": social_links,
    }


def fetch_current_members(chambers=None):
    active_chambers = list(chambers or DIRECTORIES.keys())
    members = []
    for chamber in active_chambers:
        seen_members = {}
        chamber_members = fetch_current_members_for_chamber(chamber)
        for member in chamber_members:
            member_key = (member["chamber"], member["slug"])
            if member_key in seen_members:
                continue
            seen_members[member_key] = True
            members.append(member)
    members.sort(key=lambda item: (item["chamber"], item["name"]))
    return members


def load_current_members():
    try:
        return json.loads(ROSTER_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []


def save_current_members(members):
    ROSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(members, indent=2, ensure_ascii=False) + "\n"
    ROSTER_PATH.write_text(payload, encoding="utf-8")
