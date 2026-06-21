#!/usr/bin/env python3

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.oireachtas_members import fetch_current_members, save_current_members


def main():
    parser = argparse.ArgumentParser(description="Fetch current TD and Senator roster data from Oireachtas.")
    parser.add_argument(
        "--chamber",
        choices=["all", "dail", "seanad"],
        default="all",
        help="Limit the roster refresh to a single chamber.",
    )
    args = parser.parse_args()

    chambers = None if args.chamber == "all" else [args.chamber]
    members = fetch_current_members(chambers=chambers)
    save_current_members(members)
    print(f"Wrote {len(members)} current Oireachtas members to data/derived/current_oireachtas_members.json")


if __name__ == "__main__":
    main()
