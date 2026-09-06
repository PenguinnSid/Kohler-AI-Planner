"""
File to extract product catalogue data from the PDF price book.

Uses pdf plumber to extract text from the pdf and regex to parse the text into the required fields.

Parses through the pdf and generates a csv file with the following fields:
- sku_code
- category
- subcategory
- collection
- model_name
- description
- price_inr


"""
import re
import csv
import sys
import os
import pdfplumber

# (category, start_page, end_page)

CATEGORIES = [
    ("toilet", 4, 19),
    ("mirror", 20, 27),
    ("washbasin", 32, 43),
    ("faucet", 44, 55),
    ("shower", 56, 67),
    ("bathtub", 160, 163),
]

# Permissive on the currency symbol between "MRP" and the price — it can
# render as different characters (backtick, rupee glyph, etc.) depending
# on the PDF's fonts and the pdfplumber/pdfminer version reading it.
CODE_PRICE_RE = re.compile(
    r'(?P<desc>.+?)\s+(?P<code>K-[A-Za-z0-9\-]+)\s+MRP\s*\S{0,3}\s*(?P<price>[\d,]+\.\d{2})'
)

MODEL_INDENT_THRESHOLD = 20


def extract_page_range(pdf, start, end):
    lines = []
    for page in pdf.pages[start - 1:end]:
        text = page.extract_text(layout=True) or ""
        lines.extend(text.split("\n"))
    return lines


def indentation(line):
    return len(line) - len(line.lstrip(" "))


def is_model_candidate(line):
    stripped = line.strip()
    if not stripped or len(stripped) <= 2:
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

    with pdfplumber.open(pdf_path) as pdf:
        for category, start, end in CATEGORIES:
            lines = extract_page_range(pdf, start, end)
            pending_model = None

            for line in lines:
                if not line.strip():
                    continue

                match = CODE_PRICE_RE.search(line)
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
        print("Usage: python scripts/extract_catalogue.py /path/to/PriceBook.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    out_path = os.path.join(
        os.path.dirname(__file__), "..", "app", "data", "catalogue_seed.csv"
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
