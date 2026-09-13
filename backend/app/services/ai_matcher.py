import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from app.schemas.design_request import DesignRequest

load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

MATCH_SYSTEM_PROMPT = """You are a bathroom design assistant. Given filtered
candidate products per category and a customer's budget and aesthetic theme,
choose exactly one product per category that:
1. Fits within the total budget when combined
2. Is stylistically coherent with the requested aesthetic theme
3. Comes with a one-sentence justification for why it was picked

Respond with JSON in this shape:
{
  "selections": {
    "<category>": {"sku_code": "...", "justification": "..."}
  },
  "total_price_inr": <number>
}
"""


def match_bundle(candidates: dict, request: DesignRequest) -> dict:
    """
    Stage 3 of the pipeline: send filtered candidates to the LLM and get
    back a structured, budget-fitting, style-coherent product bundle.
    Considers request.cohesion_score (0.0 = no cohesion, 0.5 = medium, 1.0 = very high).
    """
    candidate_summary = {
        category: [
            {
                "sku_code": p.sku_code,
                "model_name": p.model_name,
                "subcategory": p.subcategory,
                "price_inr": p.price_inr,
                "description": p.description,
            }
            for p in products
        ]
        for category, products in candidates.items()
    }

    cohesion_desc = "Medium cohesion (balance style and budget)"
    if request.cohesion_score <= 0.2:
        cohesion_desc = "No cohesion required (0.0). Focus purely on budget and functionality, even if styles contrast."
    elif request.cohesion_score >= 0.8:
        cohesion_desc = "Very high cohesion (1.0). Products MUST strictly match in theme, finish, and design language."

    user_prompt = f"""
Budget: {request.budget_inr} INR
Aesthetic theme: {request.aesthetic_theme}
Cohesion Score: {request.cohesion_score} ({cohesion_desc})
Room size: {request.room_width_ft}ft x {request.room_depth_ft}ft

Candidates:
{json.dumps(candidate_summary, indent=2)}
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=MATCH_SYSTEM_PROMPT,
                response_mime_type="application/json",
                max_output_tokens=1000,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"AI Matcher Exception: {e}. Falling back to candidate selection.")
        selections = {}
        total = 0
        for category, products in candidates.items():
            if products:
                chosen = products[0]
                selections[category] = {
                    "sku_code": chosen.sku_code,
                    "justification": f"Selected for {request.aesthetic_theme} theme with cohesion score {request.cohesion_score}."
                }
                total += chosen.price_inr
        return {"selections": selections, "total_price_inr": total}
