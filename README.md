# Kohler-AI-Planner


## Problem Statement Description
### Track 1: KOHLER AI Bathroom Designer & Planner

Objective: Build an interactive AI design assistant that takes a customer's constraints and automates personalized product bundle recommendations.
Key Inputs: Bathroom dimensions (ft x ft / layout or image), budget limits, aesthetic themes (e.g., Minimalist Modern, Classic Luxury, Japanese Zen), and device catalog specifications.
Expected Outcome: An intelligent recommendation engine that outputs optimized product combinations (faucets, smart toilets, thermostatic showers, vanities) fitting exact physical space and budget parameters. If possible a 2D or 3D representation of the bathroom layout with the selected products

## Features

#### Input based Design generation
user enters room dimensions, budget, theme
returns product bundles from the catalogue and generates a 2-D design

#### Selective Browsing
manually browse and select products
auto complements items to form bundles and generates the 2-D design


## Catalogue Reference

https://www.kohler.co.in/content/dam/kohler-com-INDIA/Authored%20Content/PDF/PriceBook_July26.pdf

Used the above product catalogue to extract product names, skus, prices, etc. for the major products (toilets, mirrors, basins, showers, bathtubs).

## Flow Diagram

![alt text](<docs/Flow diagram.png>)

## Project Structure
```text
kohler-bathroom-designer/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── product.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── product.py
│   │   │   └── design_request.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── products.py
│   │   │   └── design.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── catalog_filter.py
│   │   │   ├── ai_matcher.py
│   │   │   ├── layout_generator.py
│   │   │   ├── similarity.py
│   │   │   └── seed.py
│   │   └── data/
│   │       └── catalog_seed.csv
│   ├── scripts/
│   │   └── seed_catalog.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── DesignForm.jsx
│   │   │   ├── BundleResult.jsx
│   │   │   ├── LayoutViewer.jsx
│   │   │   ├── CatalogBrowser.jsx
│   │   │   └── SimilarItems.jsx
│   │   └── api/
│   │       └── client.js
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── prompts.md
│   └── architecture.md
├── README.md
└── .gitignore
```

## How to run

### Backend
Setup
```bash
cd backend
pip install -r requirements.txt
```

API key - Add the gemini api key to the .env file
```bash
GOOGLE_API_KEY=your_api_key_here
```

Extracting the price book: Download the product catalogue from the link given above.
```bash
cd backend
python scripts/extract_catalog.py /path/to/PriceBook.pdf
```

Running the Backend
```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

Setup
```bash
cd frontend
npm install
```

Running the Frontend
```bash
npm run dev
```