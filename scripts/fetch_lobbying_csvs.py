import argparse
import os
import sys
from calendar import monthrange
from datetime import date, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


EXPORT_URL = "https://api.lobbying.ie/api/ExportReturns/Csv"
DEFAULT_START_YEAR = 2015
DEFAULT_PAGE_SIZE = 50000
EXPECTED_HEADER = "Id,Url,Lobbyist Name,Date Published,Period"


def endpoint_for_window(date_from, date_to, page_size):
    params = {
        "currentPage": "0",
        "pageSize": str(page_size),
        "queryText": "",
        "subjectMatters": "",
        "subjectMatterAreas": "",
        "publicBodys": "",
        "jobTitles": "",
        "returnDateFrom": date_from.strftime("%d-%m-%Y"),
        "returnDateTo": date_to.strftime("%d-%m-%Y"),
        "period": "",
        "dpo": "",
        "client": "",
        "responsible": "",
        "lobbyist": "",
        "lobbyistId": "",
    }
    return f"{EXPORT_URL}?{urlencode(params)}"


def iter_windows(start_year, end_year, frequency, today):
    for year in range(start_year, end_year + 1):
        year_end = today if year == today.year else date(year, 12, 31)
        if year > today.year:
            continue
        if frequency == "yearly":
            yield year, date(year, 1, 1), year_end
            continue

        if frequency == "monthly":
            for month in range(1, 13):
                start = date(year, month, 1)
                if start > year_end:
                    break
                end = date(year, month, monthrange(year, month)[1])
                yield f"{year}-{month:02d}", start, min(end, year_end)
            continue

        start = date(year, 1, 1)
        week = 1
        while start <= year_end:
            end = min(start + timedelta(days=6), year_end)
            yield f"{year}-w{week:02d}", start, end
            start = end + timedelta(days=1)
            week += 1


def add_months(value, months):
    month_index = value.year * 12 + value.month - 1 + months
    year = month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def iter_recent_months(count, today):
    first_month = add_months(date(today.year, today.month, 1), 1 - count)
    current = first_month
    while current <= today:
        end = min(date(current.year, current.month, monthrange(current.year, current.month)[1]), today)
        yield f"{current.year}-{current.month:02d}", current, end
        current = add_months(current, 1)


def fetch_csv(url, timeout):
    request = Request(url, headers={"User-Agent": "lobbyieng-data-refresh/1.0"})
    with urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("content-type", "")
        body = response.read()
    if "csv" not in content_type.lower():
        raise RuntimeError(f"expected CSV response, got {content_type or 'unknown content type'}")
    first_line = body.decode("utf-8-sig", errors="replace").splitlines()[0]
    if not first_line.startswith(EXPECTED_HEADER):
        raise RuntimeError(f"unexpected CSV header: {first_line}")
    return body


def write_if_changed(path, body):
    try:
        with open(path, "rb") as existing:
            if existing.read() == body:
                return False
    except FileNotFoundError:
        pass

    tmp_path = f"{path}.tmp"
    with open(tmp_path, "wb") as output:
        output.write(body)
    os.replace(tmp_path, path)
    return True


def fetch_window(label, date_from, date_to, args):
    output_path = os.path.join(args.data_dir, f"Lobbying_ie_returns_results{label}.csv")
    url = endpoint_for_window(date_from, date_to, args.page_size)
    body = fetch_csv(url, args.timeout)
    changed = write_if_changed(output_path, body)
    status = "updated" if changed else "unchanged"
    print(f"{label}: {status} {output_path} ({len(body):,} bytes)")
    return changed


def main():
    parser = argparse.ArgumentParser(description="Download Register of Lobbying CSV exports.")
    parser.add_argument("--start-year", type=int, default=DEFAULT_START_YEAR)
    parser.add_argument("--end-year", type=int, default=date.today().year)
    parser.add_argument("--current-year", action="store_true", help="Only fetch windows for the current year.")
    parser.add_argument("--recent-months", type=int, help="Fetch the current month plus previous N-1 months.")
    parser.add_argument("--frequency", choices=["yearly", "monthly", "weekly"], default="yearly")
    parser.add_argument("--data-dir", default="data")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE)
    parser.add_argument("--timeout", type=int, default=120)
    args = parser.parse_args()

    today = date.today()
    if args.recent_months is not None and args.recent_months < 1:
        parser.error("--recent-months must be at least 1")

    if args.current_year:
        args.start_year = today.year
        args.end_year = today.year

    if args.end_year < args.start_year:
        parser.error("--end-year must be greater than or equal to --start-year")

    os.makedirs(args.data_dir, exist_ok=True)
    changed = 0
    try:
        windows = (
            iter_recent_months(args.recent_months, today)
            if args.recent_months is not None
            else iter_windows(args.start_year, args.end_year, args.frequency, today)
        )
        for label, date_from, date_to in windows:
            changed += int(fetch_window(label, date_from, date_to, args))
    except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
        print(f"CSV download failed: {exc}", file=sys.stderr)
        return 1

    print(f"Done. {changed} file(s) changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
