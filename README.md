# Kohler-AI-Planner

## Problem Statement Description
### Track 1: KOHLER AI Bathroom Designer & Planner

Objective: Build an interactive AI design assistant that takes a customer's constraints and automates personalized product bundle recommendations.
Key Inputs: Bathroom dimensions (ft x ft / layout or image), budget limits, aesthetic themes (e.g., Minimalist Modern, Classic Luxury, Japanese Zen), and device catalog specifications.
Expected Outcome: An intelligent recommendation engine that outputs optimized product combinations (faucets, smart toilets, thermostatic showers, vanities) fitting exact physical space and budget parameters. Provides both an interactive 2D floorplan painter and a full 3D room representation of the bathroom layout with selected Kohler products.

## Project Description
Interactive AI-based bathroom design assistant and 3D visualizer.

Accepts the following input parameters:
- Bathroom Dimensions (Width x Depth in feet)
- Budget Limits
- Aesthetic Style / Theme (Minimalist Modern, Classic Luxury, Japanese Zen)
- Interactive 2D Custom Fixture Positioning (Optional)

Outputs a comprehensive product bundle matching user requirements from the Kohler catalogue, alongside an interactive 2D room floorplan painter and a full 3D bathroom walkthrough environment.

## Features

#### Input-Based AI Design Generation
- User enters room dimensions, budget limits, and aesthetic theme.
- Recommendation pipeline filters Kohler catalogue to generate matching product bundles (toilets, seats, washbasins, faucets, bathtubs) optimized for room size and budget parameters.

#### Interactive 2D Room & Floorplan Painter
- Interactive drag-and-drop 2D room layout editor (`LayoutPlanner2D.jsx`).
- 4-wall snapping for doors and windows to any wall edge (Back, Front, Left, Right).
- Front-edge gold accent indicator bars and `FRONT ▼` labels on fixture blocks showing facing orientation.
- Enforces automatic 3-inch minimum cabinet margin on each side of the washbasin.
- Real-time overlap collision validation preventing invalid item overlap.

#### Interactive 3D Bathroom Visualizer & Fixture Inspector
- Full 3D room environment built with Three.js / React Three Fiber (`LayoutViewer3D.jsx`).
- Dynamic theme-matched floor and wall textures (Carrara Marble tiles for Classic Luxury, Cedar wood slats for Japanese Zen, Smooth Pure White for Minimalist Modern).
- Renders high-detail 3D Kohler OBJ models (Veil, ModernLife, Span, Reach) and procedural CAD fixtures.
- Fixture Inspection View: Clicking any catalogue fixture focuses the camera on the front of the item from inside the room while locking orbit controls.
- Symmetric Trajectory Retracing: Clicking the bottom-right transparent `Reset View` button smoothly retraces the exact camera trajectory backward to your previous viewing angle.
- Interactive Pulsating Hotspots & Callout Cards: Floating spec cards with product names, dimensions, pricing in INR, and quiet-close seat notes.

#### Selective Catalogue Browsing & Product Matching
- Manually browse, search, and select Kohler products across categories.
- Auto-complements items into complete bundles and updates 2D and 3D room representations.
- Product similarity engine recommending alternative fixtures matching theme and budget.

## Catalogue Reference

- https://www.studiokohler.com/resources/technical-specifications - 3D Obj Files
- https://www.kohler.co.in/ - Prices

## Flow Diagram

![Flow Diagram](docs/Flow%20diagram.png)

## Prompts Documentation

- The docs/ folder contains the prompt documentation and details about the AI tools used.
- It also contains a short presentation showcasing the tech stack and workflow.

- Demo Video: 
https://drive.google.com/drive/folders/1CwETve5fKgHNUAkR9_tZQxUYY4QVQ0jy?usp=sharing

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
│   │   │   ├── design.py
│   │   │   └── models_3d.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── catalog_filter.py
│   │   │   ├── ai_matcher.py
│   │   │   ├── layout_generator.py
│   │   │   ├── similarity.py
│   │   │   └── seed.py
│   │   └── data/
│   │       └── catalogue.csv
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── DesignForm.jsx
│   │   │   ├── BundleResult.jsx
│   │   │   ├── LayoutViewer3D.jsx
│   │   │   ├── LayoutPlanner2D.jsx
│   │   │   ├── CatalogBrowser.jsx
│   │   │   ├── SimilarItems.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   └── api/
│   │       └── client.js
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── prompts.pdf
│   ├── presentation.pdf
│   └── Flow diagram.png
├── README.md
└── .gitignore
```

## How to Run

### Backend

#### Setup
```bash
cd backend
pip install -r requirements.txt
```

#### API Configuration
Add your Google Gemini API key to the `.env` file inside the `backend` directory:
```bash
GOOGLE_API_KEY=your_api_key_here
```

#### Running the Backend Server
```bash
cd backend
uvicorn app.main:app --reload
```
The FastAPI backend server will start at `http://localhost:8000` and automatically seed the database from `catalogue.csv` on startup.

### Frontend

#### Setup
```bash
cd frontend
npm install
```

#### Running the Frontend Development Server
```bash
cd frontend
npm run dev
```
The Vite frontend development server will start at `http://localhost:5173`.