# Kohler-AI-Planner


## Problem Statement Description
### Track 1: KOHLER AI Bathroom Designer & Planner

Objective: Build an interactive AI design assistant that takes a customer's constraints and automates personalized product bundle recommendations.
Key Inputs: Bathroom dimensions (ft x ft / layout or image), budget limits, aesthetic themes (e.g., Minimalist Modern, Classic Luxury, Japanese Zen), and device catalog specifications.
Expected Outcome: An intelligent recommendation engine that outputs optimized product combinations (faucets, smart toilets, thermostatic showers, vanities) fitting exact physical space and budget parameters. If possible a 2D or 3D representation of the bathroom layout with the selected products

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

