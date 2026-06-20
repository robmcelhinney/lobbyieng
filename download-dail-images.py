import os
import re
import requests
import unicodedata

API_BASE = "https://api.oireachtas.ie/v1"
MEMBERS_EP = f"{API_BASE}/members"
OUTPUT_DIR = os.path.join("public", "images", "td_thumbnails")
REQUEST_TIMEOUT = (10, 30)

# JS-style slugify: normalize, strip diacritics, lowercase, spaces→hyphens
def slugify(name: str) -> str:
    name = unicodedata.normalize("NFD", name)
    name = ''.join(ch for ch in name if not unicodedata.combining(ch))
    name = name.lower()
    name = re.sub(r"\s+", "-", name)
    return name


def download_thumbnails(page_size: int = 100):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    downloaded = 0
    skipped = 0
    failed = 0

    # initial call to get total
    head_resp = requests.get(
        MEMBERS_EP,
        params={"date_start": "2024-11-29", "chamber": "dail", "limit": 1, "skip": 0},
        timeout=REQUEST_TIMEOUT,
    )
    head_resp.raise_for_status()
    total = head_resp.json()["head"]["counts"]["memberCount"]
    print(f"Total members: {total}")

    # paginate
    for skip in range(0, total, page_size):
        resp = requests.get(
            MEMBERS_EP,
            params={"date_start": "2024-11-29", "chamber": "dail", "limit": page_size, "skip": skip},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])

        for rec in results:
            m = rec.get("member", {})
            if not m.get("uri"):
                continue

            # build thumbnail URL
            thumb_url = f"{m['uri']}/image/large"
            # derive name for filename
            full_name = m.get("fullName") or f"{m.get('firstName','')} {m.get('lastName','')}"
            filename = slugify(full_name)
            existing_paths = [
                os.path.join(OUTPUT_DIR, filename + ext)
                for ext in (".jpg", ".jpeg", ".png")
            ]
            if any(os.path.exists(path) for path in existing_paths):
                skipped += 1
                continue

            # download image
            try:
                r = requests.get(thumb_url, stream=True, timeout=REQUEST_TIMEOUT)
            except requests.RequestException as exc:
                print(f"Failed to download {thumb_url}: {exc}")
                failed += 1
                continue
            if not r.ok:
                print(f"Failed to download {thumb_url}: {r.status_code}")
                failed += 1
                continue

            # detect extension
            content_type = r.headers.get("Content-Type", "")
            ext = ".jpg" if "jpeg" in content_type else ".png" if "png" in content_type else ""
            if not ext:
                print(f"Unknown Content-Type '{content_type}' for {thumb_url}, skipping.")
                failed += 1
                continue

            # save file
            out_path = os.path.join(OUTPUT_DIR, filename + ext)
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
            downloaded += 1
            print(f"Saved {out_path}")

        print(f"Processed {min(skip + page_size, total)}/{total} members")

    print(f"Complete: {downloaded} downloaded, {skipped} already present, {failed} failed")

if __name__ == "__main__":
    try:
        download_thumbnails(200)
    except requests.RequestException as exc:
        raise SystemExit(f"Oireachtas API request failed: {exc}") from exc
