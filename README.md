# YUKTIK 2026 — AI Emergency Coordination Platform

## Quick Start

```bash
# From d:\YUTIK\
start.bat        # Windows: starts both servers + opens browser
```

Or manually:

```bash
# Terminal 1 — Backend
cd d:\YUTIK\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd d:\YUTIK\frontend
npm run dev
```

Then open **http://localhost:5173**

---

## Architecture

```
d:\YUTIK\
  backend\                   # FastAPI + SQLite
    main.py                  # App entry point
    database.py              # SQLAlchemy SQLite
    models.py                # DB models
    schemas.py               # Pydantic schemas
    seed_data.py             # 8 ambulances + 6 Bangalore hospitals
    services\
      ai_engine.py           # Severity prediction + NLP classification
      allocator.py           # Haversine resource allocation
      simulator.py           # 5-step demo scenario
    routers\
      incidents.py           # POST /api/incidents/report
      ambulances.py          # GET/PUT /api/ambulances
      hospitals.py           # GET/PUT /api/hospitals
      allocation.py          # POST /api/allocation/trigger/{id}
      dashboard.py           # GET /api/dashboard/stats
      simulation.py          # POST /api/simulation/scenario
      websocket.py           # WS /ws
  frontend\                  # React + Vite + Tailwind
    src\
      pages\
        Overview.jsx         # Command centre + demo scenario
        Incidents.jsx        # Report + manage incidents
        Ambulances.jsx       # Fleet management
        Hospitals.jsx        # Capacity monitoring
        Allocation.jsx       # AI allocation view
        History.jsx          # Records table
      components\
        layout\              # Sidebar, TopBar, Layout
        map\                 # EmergencyMap (Leaflet)
        cards\               # StatCard, IncidentCard, AllocationCard
      hooks\useWebSocket.js  # WS real-time hook
      utils\api.js           # Axios + WS config
  start.bat                  # One-click launcher
```

## Demo Scenario

On the **Overview** page, click through the 5 scenario steps:

1. **Init A, B, C** — Road accident (5 people), cardiac emergency, urban flooding (15 trapped). AI allocates nearest ambulance + best hospital to each.
2. **Ambulance Breaks Down** — Nearest assigned ambulance becomes unavailable. System auto-reallocates from remaining fleet.
3. **Hospital ICU Full** — Selected hospital's ICU capacity hits 0. AI switches to next best hospital.
4. **Traffic Congestion** — Heavy rain applies 1.5× delay multiplier. All ETAs recalculated.
5. **New Emergency** — Mass casualty event arrives. AI allocates from remaining available resources.

## API Reference

| Endpoint | Description |
|---|---|
| `GET /api/dashboard/stats` | KPI summary |
| `POST /api/incidents/report` | Report + auto-allocate |
| `GET /api/incidents` | List all incidents |
| `GET /api/ambulances` | Fleet status |
| `PUT /api/ambulances/{id}/status` | Update status (triggers reallocation) |
| `GET /api/hospitals` | Hospital capacity |
| `POST /api/allocation/trigger/{id}` | Manual reallocation |
| `GET /api/allocation/active` | Active allocations |
| `POST /api/simulation/scenario` | Init demo scenario |
| `POST /api/simulation/step` | Advance simulation |
| `WS /ws` | Real-time event stream |
| `GET /docs` | Swagger UI |

