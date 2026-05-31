import argparse
import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from urllib.parse import urljoin

import requests


BASE_URL = "https://www.oireachtas.ie"
COMMITTEES_URL = f"{BASE_URL}/en/committees/"
DEFAULT_OUTPUT_PATH = "data/derived/committee_memberships.json"
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


def slugify_official_name(value):
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower().strip()
    return re.sub(r"\s+", "-", value)


def clean_text(value):
    return re.sub(r"\s+", " ", unescape(str(value or ""))).strip()


def fetch_text(url):
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.text


def extract_current_committee_links(html, house_no):
    section_match = re.search(
        r'<div class="module committee-wrapper">\s*<h2[^>]*>\s*Committees\s*<span>\s*'
        + re.escape(str(house_no))
        + r"(?:st|nd|rd|th) Dáil.*?</div>\s*</div>",
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    section = section_match.group(0) if section_match else html

    active_match = re.search(
        r'<div class="active-committees">(.*?)<div class="dissolved-committees-toggle">',
        section,
        flags=re.IGNORECASE | re.DOTALL,
    )
    active_section = active_match.group(1) if active_match else section

    committees = []
    seen = set()
    link_pattern = re.compile(
        rf'<a\s+href="(?P<href>/en/committees/{re.escape(str(house_no))}/[^"#]+/)">(?P<name>.*?)</a>',
        flags=re.IGNORECASE | re.DOTALL,
    )
    for match in link_pattern.finditer(active_section):
        href = match.group("href")
        name = clean_text(re.sub(r"<[^>]+>", " ", match.group("name")))
        if not name or href in seen:
            continue
        seen.add(href)
        committee_url = urljoin(BASE_URL, href)
        committees.append(
            {
                "name": name,
                "url": committee_url,
                "membership_url": urljoin(BASE_URL, f"{href}membership/"),
                "house_no": str(house_no),
            }
        )
    return committees


class MembershipPageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.committee_name = ""
        self.members = []
        self._capture_title = False
        self._capture_role = False
        self._capture_member_name = False
        self._title_chunks = []
        self._role_chunks = []
        self._member_name_chunks = []
        self._in_member_box = False
        self._member_box_depth = 0
        self._current_member = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        classes = set((attrs_dict.get("class") or "").split())

        if self._in_member_box and tag not in VOID_TAGS:
            self._member_box_depth += 1

        if tag == "h2" and "c-committee-membership__title" in classes:
            self._capture_title = True
            self._title_chunks = []

        if tag == "div" and "member_box" in classes:
            self._in_member_box = True
            self._member_box_depth = 1
            self._current_member = {
                "member_name": "",
                "member_slug": "",
                "member_uri": "",
                "member_url": "",
                "role": "",
                "email": attrs_dict.get("data-email", ""),
                "phones": attrs_dict.get("data-phones", ""),
                "constituency": attrs_dict.get("data-constituency", ""),
            }

        if not self._in_member_box or self._current_member is None:
            return

        if tag == "img" and "member_profile_img" in classes:
            member_name = clean_text(attrs_dict.get("alt", ""))
            image_src = attrs_dict.get("src", "")
            self._current_member["member_name"] = member_name
            self._current_member["member_slug"] = slugify_official_name(member_name)
            self._current_member["member_uri"] = re.sub(r"/image/[^/]+/?$", "", image_src)

        if tag == "div" and "committee_member_chair" in classes:
            self._capture_role = True
            self._role_chunks = []

        if tag == "a" and "committee_member_link" in classes:
            self._capture_member_name = True
            self._member_name_chunks = []
            self._current_member["member_url"] = urljoin(BASE_URL, attrs_dict.get("href", ""))
            self._current_member["email"] = attrs_dict.get("data-email", self._current_member.get("email", ""))
            self._current_member["phones"] = attrs_dict.get("data-phones", self._current_member.get("phones", ""))
            self._current_member["constituency"] = attrs_dict.get(
                "data-constituency", self._current_member.get("constituency", "")
            )

    def handle_data(self, data):
        if self._capture_title:
            self._title_chunks.append(data)
        if self._capture_role:
            self._role_chunks.append(data)
        if self._capture_member_name:
            self._member_name_chunks.append(data)

    def handle_endtag(self, tag):
        if tag == "h2" and self._capture_title:
            self.committee_name = clean_text(" ".join(self._title_chunks))
            self._capture_title = False

        if tag == "div" and self._capture_role and self._current_member is not None:
            self._current_member["role"] = clean_text(" ".join(self._role_chunks))
            self._capture_role = False

        if tag == "a" and self._capture_member_name and self._current_member is not None:
            member_name = clean_text(" ".join(self._member_name_chunks))
            if member_name:
                self._current_member["member_name"] = member_name
                self._current_member["member_slug"] = slugify_official_name(member_name)
            self._capture_member_name = False

        if self._in_member_box:
            self._member_box_depth -= 1
            if self._member_box_depth <= 0:
                if self._current_member and self._current_member.get("member_name"):
                    self.members.append(self._current_member)
                self._in_member_box = False
                self._current_member = None


def parse_membership_page(html):
    parser = MembershipPageParser()
    parser.feed(html)
    return parser.committee_name, parser.members


def fetch_committee_memberships(house_no):
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    committees = extract_current_committee_links(fetch_text(COMMITTEES_URL), house_no)
    memberships = []

    for idx, committee in enumerate(committees, start=1):
        print(f"[{idx}/{len(committees)}] {committee['name']}")
        try:
            page_html = fetch_text(committee["membership_url"])
        except requests.HTTPError as exc:
            print(f"  Skipping membership page: {exc}")
            continue

        page_committee_name, members = parse_membership_page(page_html)
        if page_committee_name:
            committee["name"] = page_committee_name
        committee["scraped_at"] = generated_at

        for member in members:
            memberships.append(
                {
                    **member,
                    "committee_name": committee["name"],
                    "committee_url": committee["url"],
                    "membership_url": committee["membership_url"],
                    "house_no": committee["house_no"],
                    "scraped_at": generated_at,
                }
            )

    return {
        "generated_at": generated_at,
        "source_url": COMMITTEES_URL,
        "house_no": str(house_no),
        "committees": committees,
        "memberships": memberships,
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch current Oireachtas committee memberships.")
    parser.add_argument("--house-no", default="34", help="Dáil number shown in Oireachtas committee URLs.")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH, help="JSON file to write.")
    args = parser.parse_args()

    payload = fetch_committee_memberships(args.house_no)
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(
        f"Wrote {len(payload['memberships'])} memberships across "
        f"{len(payload['committees'])} committees to {args.output}"
    )


if __name__ == "__main__":
    main()
