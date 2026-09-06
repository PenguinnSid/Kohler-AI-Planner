"""
Enriches app/data/catalogue_seed.csv with style_tags, width_in, and depth_in —
fields the Kohler price book doesn't include. Uses the Gemini API to infer
plausible values from each product's category and description.

Usage (from backend/):
    python scripts/enrich_catalogue.py

Requires GOOGLE_API_KEY in your .env (from aistudio.google.com — free tier
is enough for this). Processes products in batches of ~20 per API call to
keep this fast (roughly 25 calls total, not ~470).

Safe to re-run: skips rows that already have style_tags filled in, so an
interrupted run can just be restarted.
"""
import csv
import json
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "catalogue_seed.csv")
BATCH_SIZE = 20

STYLE_VOCAB = [
    "minimalist", "modern", "classic", "luxury", "ornate",
    "zen", "natural", "sleek", "traditional", "contemporary",
]

CATEGORY_DIMENSION_HINTS = {
    "toilet": "typical footprint 14-20in wide x 26-30in deep",
    "mirror": "typical size 18-40in wide x 24-48in tall (use width_in/depth_in as width/height)",
    "washbasin": "typical footprint 16-26in wide x 14-22in deep",
    "faucet": "small fixture, typical footprint 2-8in wide x 4-10in deep",
    "shower": "typical footprint 30-40in wide x 30-40in deep for enclosures; smaller for fittings/heads (4-10in)",
    "bathtub": "typical footprint 60-72in wide x 30-36in deep",
}

SYSTEM_PROMPT = f"""You are enriching a bathroom fixture catalogue with two fields
missing from the source data: style_tags and estimated footprint dimensions.

Style tags must come ONLY from this fixed vocabulary: {", ".join(STYLE_VOCAB)}.
Assign 1-3 tags per product based on its description (materials, finish,
shape, design language).

Dimensions should be a plausible estimate for the product given its
category and description, using the category's typical range as a guide.
These are estimates, not real spec-sheet values — reasonable is enough.

Respond with a JSON array in this exact shape:
[
  {{"sku_code": "...", "style_tags": ["...", "..."], "width_in": 0.0, "depth_in": 0.0}}
]
"""


def load_rows():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader), reader.fieldnames


def write_rows(rows, fieldnames):
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def chunk(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def enrich_batch(category, batch):
    hint = CATEGORY_DIMENSION_HINTS.get(category, "")
    payload = [
        {"sku_code": r["sku_code"], "description": r["description"]}
        for r in batch
    ]
    user_prompt = f"""Category: {category}
Dimension guide: {hint}

Products:
{json.dumps(payload, indent=2)}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            max_output_tokens=2000,
        ),
    )

    return json.loads(response.text)


def merge_enrichment(rows, enriched_batch):
    by_sku = {item["sku_code"]: item for item in enriched_batch}
    for row in rows:
        item = by_sku.get(row["sku_code"])
        if item:
            row["style_tags"] = ";".join(item.get("style_tags", []))
            row["width_in"] = item.get("width_in", "")
            row["depth_in"] = item.get("depth_in", "")
            row["dimension_source"] = "llm_estimated"


def main():
    rows, fieldnames = load_rows()
    pending = [r for r in rows if not r.get("style_tags")]
    print(f"{len(pending)} of {len(rows)} products need enrichment.")

    by_category = {}
    for r in pending:
        by_category.setdefault(r["category"], []).append(r)

    total_batches = sum(
        (len(items) + BATCH_SIZE - 1) // BATCH_SIZE for items in by_category.values()
    )
    done = 0

    for category, items in by_category.items():
        for batch in chunk(items, BATCH_SIZE):
            done += 1
            print(f"[{done}/{total_batches}] {category} batch of {len(batch)}...")
            try:
                enriched = enrich_batch(category, batch)
                merge_enrichment(rows, enriched)
                write_rows(rows, fieldnames)  # save progress after every batch
            except Exception as e:
                print(f"  Failed, skipping this batch: {e}")
            time.sleep(0.5)

    print("Done.")


if __name__ == "__main__":
    main()
