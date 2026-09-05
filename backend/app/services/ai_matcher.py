import os
import json
from anthropic import Anthropic
from app.schemas.design_request import DesignRequest

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MATCH_SYSTEM_PROMPT = """You are a bathroom design assistant. Given filtered
candidate products per category and a customer's budget and aesthetic theme,
choose exactly one product per category that:
1. Fits within the total budget when combined
2. Is stylistically coherent with the requested aesthetic theme
3. Comes with a one-sentence justification for why it was picked

Respond ONLY with valid JSON in this shape, no other text:
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
    """
    candidate_summary = {
        category: [
            {
                "sku_code": p.sku_code,
                "model_name": p.model_name,
                "collection": p.collection,
                "price_inr": p.price_inr,
                "description": p.description,
            }
            for p in products
        ]
        for category, products in candidates.items()
    }

    user_prompt = f"""
Budget: {request.budget_inr} INR
Aesthetic theme: {request.aesthetic_theme}
Room size: {request.room_width_ft}ft x {request.room_depth_ft}ft

Candidates:
{json.dumps(candidate_summary, indent=2)}
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=MATCH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    text = response.content[0].text
    return json.loads(text)
