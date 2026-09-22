"""Theme-aware recommendation using OpenRouter for explanations and local validation."""
import json
import os
from itertools import product as cartesian_product

import httpx
from dotenv import load_dotenv

load_dotenv()
FLOOR_THEME_IDS = ["marble", "slate", "wood", "hex", "concrete"]
WALL_THEME_IDS = ["subway", "marble", "wood", "slate", "travertine"]
THEME_WORDS = {
    "Minimalist Modern": {"modern", "minimal", "sleek", "geometric", "architectural", "contemporary", "clean", "chrome", "white", "grey"},
    "Classic Luxury": {"classic", "luxury", "ornate", "sculptural", "gold", "bronze", "marble", "traditional", "elegant"},
    "Japanese Zen": {"zen", "natural", "warm", "organic", "wood", "stone", "understated", "earthy", "calm"},
}


def product_payload(p):
    return {"sku_code": p.sku_code, "category": p.category, "subcategory": p.subcategory, "model_name": p.model_name, "description": p.description or "", "price_inr": p.price_inr or 0, "colour": p.colour or "", "style_tags": p.style_tags or [], "width_in": p.width_in, "depth_in": p.depth_in, "height_in": p.height_in, "has_3d_model": p.has_3d_model, "obj_file_path": p.obj_file_path}


def _default_floor(theme):
    return {"Minimalist Modern": "hex", "Classic Luxury": "marble", "Japanese Zen": "wood"}.get(theme, "marble")


def _default_wall(theme):
    return {"Minimalist Modern": "subway", "Classic Luxury": "travertine", "Japanese Zen": "wood"}.get(theme, "subway")


def _score(item, request):
    text = " ".join([item.model_name or "", item.description or "", item.colour or "", " ".join(item.style_tags or [])]).lower()
    theme = sum(word in text for word in THEME_WORDS.get(request.aesthetic_theme, set()))
    room_area = request.room_width_ft * request.room_depth_ft * 144
    footprint = (item.width_in or 0) * (item.depth_in or 0)
    fit = 2 if footprint and footprint < room_area * .24 else (-8 if footprint > room_area * .45 else 0)
    return theme * (2 + request.cohesion_score * 3) + fit


def _best_bundle(candidates, request):
    ranked = {cat: sorted(items, key=lambda p: _score(p, request), reverse=True)[:6] for cat, items in candidates.items() if items}
    categories = list(ranked)
    if not categories:
        return {}
    best, best_score = None, float("-inf")
    for combo in cartesian_product(*(ranked[cat] for cat in categories)):
        total = sum(p.price_inr or 0 for p in combo)
        if request.budget_inr > 0 and total > request.budget_inr:
            continue
        colours = [str(p.colour or "").lower() for p in combo if p.colour]
        score = sum(_score(p, request) for p in combo) + (len(colours) - len(set(colours))) * (1 + request.cohesion_score * 2)
        if score > best_score:
            best, best_score = combo, score
    if best is None:  # An impossible budget still gets the least-expensive complete set.
        best = min(cartesian_product(*(ranked[cat] for cat in categories)), key=lambda combo: sum(p.price_inr or 0 for p in combo))
    return dict(zip(categories, best))


def _openrouter(prompt, system):
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        return None
    response = httpx.post("https://openrouter.ai/api/v1/chat/completions", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173"), "X-Title": "Kohler AI Planner"}, json={"model": os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"), "temperature": .25, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}]}, timeout=25)
    response.raise_for_status()
    return json.loads(response.json()["choices"][0]["message"]["content"])


def match_bundle(candidates, request):
    """Allocate a complete, style-coherent set. The LLM cannot invent products or prices."""
    chosen = _best_bundle(candidates, request)
    selections = {cat: {"sku_code": p.sku_code, "justification": f"Matches the {request.aesthetic_theme} palette through its {', '.join((p.style_tags or [])[:2]) or 'balanced'} design language."} for cat, p in chosen.items()}
    try:
        response = _openrouter(json.dumps({"theme": request.aesthetic_theme, "products": [product_payload(p) for p in chosen.values()]}), "Return JSON {justifications:{SKU:short aesthetic reason}}. Reference only supplied SKUs and do not recommend items.")
        for selection in selections.values():
            selection["justification"] = response.get("justifications", {}).get(selection["sku_code"], selection["justification"])
    except Exception as exc:
        print(f"OpenRouter rationale unavailable: {exc}")
    return {"selections": selections, "total_price_inr": sum(p.price_inr or 0 for p in chosen.values()), "recommended_floor_theme": _default_floor(request.aesthetic_theme), "recommended_wall_theme": _default_wall(request.aesthetic_theme)}
