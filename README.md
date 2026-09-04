# Kohler-AI-Planner


## Problem Statement Description
### Track 1: KOHLER AI Bathroom Designer & Planner

Objective: Build an interactive AI design assistant that takes a customer's constraints and automates personalized product bundle recommendations.
Key Inputs: Bathroom dimensions (ft x ft / layout or image), budget limits, aesthetic themes (e.g., Minimalist Modern, Classic Luxury, Japanese Zen), and device catalog specifications.
Expected Outcome: An intelligent recommendation engine that outputs optimized product combinations (faucets, smart toilets, thermostatic showers, vanities) fitting exact physical space and budget parameters. If possible a 2D or 3D representation of the bathroom layout with the selected products

## Catalogue Reference

https://www.kohler.co.in/content/dam/kohler-com-INDIA/Authored%20Content/PDF/PriceBook_July26.pdf

Used the above product catalogue to extract product names, skus, prices, etc. for the major products (toilets, mirrors, basins, showers, bathtubs)

## Project Structure
```text
kohler-bathroom-designer/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entrypoint
│   │   ├── config.py                # env/settings
│   │   ├── database.py              # Supabase/Postgres connection
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   └── product.py
│   │   ├── schemas/                 # Pydantic request/response shapes
│   │   │   ├── __init__.py
│   │   │   ├── product.py
│   │   │   └── design_request.py
│   │   ├── routers/                 # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── products.py          # GET /products
│   │   │   └── design.py            # POST /design → runs the full pipeline
│   │   ├── services/                # the actual pipeline logic
│   │   │   ├── __init__.py
│   │   │   ├── catalog_filter.py    # stage 2: budget/style/fit filtering
│   │   │   ├── ai_matcher.py        # stage 3: LLM matching + justification
│   │   │   └── layout_generator.py  # stage 4b: 2D SVG placement
│   │   └── data/
│   │       └── catalog_seed.json    # your synthetic catalog
│   ├── scripts/
│   │   └── seed_catalog.py          # loads catalog_seed.json into DB
│   ├── alembic/                     # migrations, same as MentorOS
│   ├── tests/
│   │   └── test_matching.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── DesignForm.jsx       # stage 1: dimensions/budget/theme input
│   │   │   ├── BundleResult.jsx     # stage 5a: recommended products
│   │   │   └── LayoutViewer.jsx     # stage 5b: SVG room layout
│   │   └── api/
│   │       └── client.js
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── prompts.md                   # running log → compiles into the required PDF
│   └── architecture.md
├── README.md
└── .gitignore
```

## How to run

