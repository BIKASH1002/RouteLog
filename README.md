# RouteLog

Automated trip planning and FMCSA daily log generation for property-carrying drivers.

## Architecture

```mermaid
flowchart TB
    subgraph FE["🌐 Browser — Vercel"]
        direction TB
        Pages["Pages: Plan Trip · Trip Results · Daily Log Sheets"]
        API["lib/api.ts — HTTP client"]
        Pages --> API
    end

    subgraph BE["⚙️ Django Backend — Render"]
        direction TB
        Views["api.py — thin @api_view handlers"]
        Helpers["helpers.py — orchestration"]
        Pure["hos_engine.py · eld_logs.py · routing.py"]
        Views --> Helpers --> Pure
    end

    subgraph DB["🗄️ Neon PostgreSQL"]
        Tables[("8 normalised tables")]
    end

    ORS(["OpenRouteService<br/>geocode + routing"])

    API ==>|"HTTPS / JSON"| Views
    Pure ==>|"Django ORM"| Tables
    Pure -.->|"external API"| ORS

    style FE fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E3A8A
    style BE fill:#F1F5F9,stroke:#0F172A,stroke-width:2px,color:#0F172A
    style DB fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#14532D
    style ORS fill:#FEF3C7,stroke:#D97706,stroke-width:2px,color:#78350F
```

## Stack

- **Backend:** Django 5 + DRF + PostgreSQL
- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Leaflet
- **Routing:** OpenRouteService (free tier)
- **Map:** OpenStreetMap via Leaflet

## Repo layout

    routelog/
    ├── backend/     Django project (routelog) + trips app
    └── frontend/    React + Vite app

## Local setup

### Backend

    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env       # add your ORS_API_KEY
    python manage.py migrate
    python manage.py runserver

### Frontend

    cd frontend
    npm install
    cp .env.example .env
    npm run dev

Open http://localhost:5173.

## Tests

    cd backend
    pytest

27 tests covering the HOS engine and daily log splitter.

## HOS rules modeled (49 CFR Part 395)

- 11-hour driving limit per shift
- 14-hour on-duty window
- 30-minute break after 8 cumulative driving hours
- 10-hour off-duty reset
- 70-hour / 8-day cycle with 34-hour restart
- Fueling every 1,000 miles
- 1-hour pickup and dropoff
