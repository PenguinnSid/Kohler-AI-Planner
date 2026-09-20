import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from app.schemas.design_request import DesignRequest

load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# Available surface theme IDs must match frontend FLOOR_THEMES / WALL_THEMES
FLOOR_THEME_IDS = ["marble", "slate", "wood", "hex", "concrete"]
WALL_THEME_IDS = ["subway", "marble", "wood", "slate", "travertine"]

MATCH_SYSTEM_PROMPT = f"""You are a luxury bathroom interior design AI. Given filtered candidate products per category and the customer's specifications, select exactly one product per category.

Selection criteria (in priority order):
1. Aesthetic coherence — product style_tags, description, finish and colour must align with the requested theme.
   - "Minimalist Modern": clean lines, matte/chrome finishes, neutral whites and greys, geometric forms
   - "Classic Luxury": ornate detailing, gold/bronze finishes, curves, warm marble tones, traditional forms
   - "Japanese Zen": natural materials, earthy tones, understated minimalism, wood and stone textures
2. Dimension fit — prefer products whose width_in / depth_in fit comfortably in the room dimensions provided.
3. Budget fit — combined total must not exceed the budget. If budget is 0 or unset, ignore price completely and pick purely for style.
4. Colour harmony — products should form a coherent colour palette together.

Additionally, recommend the best matching floor and wall surface themes from the lists below based on the aesthetic theme and selected product palette.

Available floor theme IDs: {FLOOR_THEME_IDS}
Available wall theme IDs: {WALL_THEME_IDS}

Theme surface mappings (use as a guide, not a strict rule):
- "Minimalist Modern": floor=hex or marble, wall=subway or marble
- "Classic Luxury": floor=marble, wall=marble or travertine
- "Japanese Zen": floor=wood or concrete, wall=wood or travertine

Respond ONLY with valid JSON in this exact shape, no markdown, no extra keys:
{{
  "selections": {{
    "<category>": {{
      "sku_code": "...",
      "justification": "One sentence explaining the pick."
    }}
  }},
  "total_price_inr": <number>,
  "recommended_floor_theme": "<floor_theme_id>",
  "recommended_wall_theme": "<wall_theme_id>"
}}
"""


def match_bundle(candidates: dict, request: DesignRequest) -> dict:
    """
    Stage 3 of the pipeline: send filtered candidates to the LLM and get back
    a structured, budget-fitting, style-coherent product bundle.

    The LLM also recommends floor/wall surface theme IDs that match the
    chosen aesthetic and product palette.
    """
    candidate_summary = {}
    for category, products in candidates.items():
        candidate_summary[category] = [
            {
                "sku_code": p.sku_code,
                "model_name": p.model_name,
                "subcategory": p.subcategory,
                "price_inr": p.price_inr,
                "description": p.description,
                "colour": p.colour,
                "style_tags": p.style_tags,
                "width_in": p.width_in,
                "depth_in": p.depth_in,
                "height_in": p.height_in,
            }
            for p in products
        ]

    cohesion_desc = "Medium cohesion — balance style and budget."
    if request.cohesion_score <= 0.2:
        cohesion_desc = "No cohesion required. Focus purely on budget and functionality."
    elif request.cohesion_score >= 0.8:
        cohesion_desc = "Very high cohesion. Products MUST strictly match in theme, finish, and design language."

    budget_note = (
        f"{request.budget_inr} INR total budget"
        if request.budget_inr and request.budget_inr > 0
        else "No budget constraint — prioritise style."
    )

    user_prompt = f"""
Aesthetic theme: {request.aesthetic_theme}
Room dimensions: {request.room_width_ft} ft wide x {request.room_depth_ft} ft deep
Budget: {budget_note}
Cohesion: {request.cohesion_score} ({cohesion_desc})
Bath section mode: {getattr(request, 'bath_section_mode', 'shower')}

Candidate products by category:
{json.dumps(candidate_summary, indent=2)}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=MATCH_SYSTEM_PROMPT,
                response_mime_type="application/json",
                max_output_tokens=1500,
            ),
        )
        result = json.loads(response.text)
        # Validate surface theme IDs returned by LLM
        if result.get("recommended_floor_theme") not in FLOOR_THEME_IDS:
            result["recommended_floor_theme"] = _default_floor(request.aesthetic_theme)
        if result.get("recommended_wall_theme") not in WALL_THEME_IDS:
            result["recommended_wall_theme"] = _default_wall(request.aesthetic_theme)
        return result

    except Exception as e:
        print(f"AI Matcher Exception: {e}. Falling back to first-candidate selection.")
        selections = {}
        total = 0.0
        for category, products in candidates.items():
            if products:
                chosen = products[0]
                selections[category] = {
                    "sku_code": chosen.sku_code,
                    "justification": f"Fallback: first candidate for {request.aesthetic_theme}.",
                }
                total += chosen.price_inr or 0
        return {
            "selections": selections,
            "total_price_inr": total,
            "recommended_floor_theme": _default_floor(request.aesthetic_theme),
            "recommended_wall_theme": _default_wall(request.aesthetic_theme),
        }


def _default_floor(theme: str) -> str:
    mapping = {
        "Minimalist Modern": "hex",
        "Classic Luxury": "marble",
        "Japanese Zen": "wood",
    }
    return mapping.get(theme, "marble")


def _default_wall(theme: str) -> str:
    mapping = {
        "Minimalist Modern": "subway",
        "Classic Luxury": "marble",
        "Japanese Zen": "travertine",
    }
    return mapping.get(theme, "subway")
