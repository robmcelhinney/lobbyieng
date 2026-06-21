import argparse
import os
import re
from pathlib import Path

import requests
import unicodedata

from scripts.oireachtas_members import fetch_current_members, load_current_members, save_current_members

CHAMBER_CONFIG = {
    "dail": {
        "output_dir": os.path.join("public", "images", "td_thumbnails"),
    },
    "seanad": {
        "output_dir": os.path.join("public", "images", "senator_thumbnails"),
    },
}


def slugify(name: str) -> str:
    name = unicodedata.normalize("NFD", name)
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    name = name.lower()
    name = re.sub(r"\s+", "-", name)
    return name


def get_roster(refresh: bool = False):
    members = load_current_members()
    if refresh or not members:
        members = fetch_current_members()
        save_current_members(members)
    return members


def download_thumbnails(chamber: str = "all", refresh_roster: bool = False):
    members = get_roster(refresh=refresh_roster)
    if chamber != "all":
        members = [member for member in members if member.get("chamber") == chamber]

    if not members:
        print("No current members found.")
        return

    downloaded = 0
    skipped = 0
    failed = 0
    grouped = {}
    for member in members:
        grouped.setdefault(member.get("chamber", "dail"), []).append(member)

    for chamber_name, chamber_members in grouped.items():
        output_dir = CHAMBER_CONFIG[chamber_name]["output_dir"]
        os.makedirs(output_dir, exist_ok=True)
        print(f"Processing {len(chamber_members)} current {chamber_name} members")

        for member in chamber_members:
            image_url = member.get("image_url")
            if not image_url:
                failed += 1
                continue

            filename = slugify(member.get("name", ""))
            existing_paths = [os.path.join(output_dir, filename + ext) for ext in (".jpg", ".jpeg", ".png")]
            if any(os.path.exists(path) for path in existing_paths):
                skipped += 1
                continue

            try:
                response = requests.get(image_url, stream=True, timeout=(10, 30))
            except requests.RequestException as exc:
                print(f"Failed to download {image_url}: {exc}")
                failed += 1
                continue

            if not response.ok:
                print(f"Failed to download {image_url}: {response.status_code}")
                failed += 1
                continue

            content_type = response.headers.get("Content-Type", "")
            ext = ".jpg" if "jpeg" in content_type else ".png" if "png" in content_type else ""
            if not ext:
                print(f"Unknown Content-Type '{content_type}' for {image_url}, skipping.")
                failed += 1
                continue

            out_path = os.path.join(output_dir, filename + ext)
            with open(out_path, "wb") as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            downloaded += 1
            print(f"Saved {out_path}")

    print(f"Complete: {downloaded} downloaded, {skipped} already present, {failed} failed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download current Oireachtas member images.")
    parser.add_argument("--chamber", choices=["all", "dail", "seanad"], default="all")
    parser.add_argument("--refresh-roster", action="store_true", help="Refresh the cached current roster before downloading.")
    args = parser.parse_args()
    try:
        download_thumbnails(chamber=args.chamber, refresh_roster=args.refresh_roster)
    except requests.RequestException as exc:
        raise SystemExit(f"Oireachtas image download failed: {exc}") from exc
