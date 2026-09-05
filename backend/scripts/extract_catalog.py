"""
Extracts real product data (SKU, category, price, description) from the
Kohler India Price Book PDF into app/data/catalog_seed.csv.

Usage (from backend/):
    python scripts/extract_catalog.py /path/to/PriceBook.pdf

"""
import re
import csv
import sys
import os
import subprocess

# (category, start_page, end_page)
CATEGORIES = [
    ("toilet", 4, 19),
    ("mirror", 20, 27),
    ("washbasin", 32, 43),
    ("faucet", 44, 55),
    ("shower", 56, 67),
    ("bathtub", 160, 163),
]

CODE_PRICE_RE = re.compile(
    r'^(?P<desc>.*\S)\s{2,}(?P<code>K-[A-Za-z0-9\-]+)\s+MRP\s*`\s*(?P<price>[\d,]+\.\d{2})\s*$'
)

MODEL_INDENT_THRESHOLD = 15


def extract_page_range(pdf_path, start, end):
    result = subprocess.run(
        ["pdftotext", "-layout", "-f", str(start), "-l", str(end), pdf_path, "-"],
        capture_output=True, text=True,
    )
    return result.stdout.split("\n")


def indentation(line):
    return len(line) - len(line.lstrip(" "))


def is_model_candidate(line):
    stripped = line.strip()
    if not stripped:
        return False
    if indentation(line) > MODEL_INDENT_THRESHOLD:
        return False
    lowered = stripped.lower()
    if lowered.startswith("must order"):
        return False
    if lowered in ("model", "description", "code", "mrp"):
        return False
    if "description" in lowered and "code" in lowered:
        return False
    if "main menu" in lowered:
        return False
    if stripped.isdigit():
        return False
    return True


def extract(pdf_path):
    rows = []
    seen_codes = set()

    for category, start, end in CATEGORIES:
        lines = extract_page_range(pdf_path, start, end)
        pending_model = None

        for line in lines:
            if not line.strip():
                continue

            match = CODE_PRICE_RE.match(line)
            if match:
                desc = match.group("desc").strip()
                code = match.group("code").strip()
                price_str = match.group("price").replace(",", "")
                try:
                    price = float(price_str)
                except ValueError:
                    continue

                if code in seen_codes:
                    continue
                seen_codes.add(code)

                model_name = pending_model or desc[:40].strip()
                rows.append({
                    "sku_code": code,
                    "category": category,
                    "subcategory": "",
                    "collection": pending_model or "",
                    "model_name": model_name,
                    "description": desc,
                    "price_inr": price,
                    "style_tags": "",
                    "width_in": "",
                    "depth_in": "",
                    "dimension_source": "unestimated",
                })
            elif is_model_candidate(line):
                pending_model = line.strip()

    return rows


def clean_rows(rows):
    """Blank out model_name/collection where the layout heuristic likely
    picked up noise (merged columns, spec-table headers, etc.), and
    backfill model_name from the description so nothing ships garbled."""
    for r in rows:
        name = r["model_name"]
        if "incl of all taxes" in name.lower() or "   " in name or len(name) > 45:
            r["model_name"] = r["description"][:40].strip()
            r["collection"] = ""
    return rows


def write_csv(rows, out_path):
    fieldnames = [
        "sku_code", "category", "subcategory", "collection", "model_name",
        "description", "price_inr", "style_tags", "width_in", "depth_in",
        "dimension_source",
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/extract_catalog.py /path/to/PriceBook.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    out_path = os.path.join(
        os.path.dirname(__file__), "..", "app", "data", "catalog_seed.csv"
    )

    rows = extract(pdf_path)
    rows = clean_rows(rows)
    write_csv(rows, out_path)

    print(f"Extracted {len(rows)} products across {len(CATEGORIES)} categories.")
    by_category = {}
    for r in rows:
        by_category[r["category"]] = by_category.get(r["category"], 0) + 1
    for cat, count in by_category.items():
        print(f"  {cat}: {count}")
