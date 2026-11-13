from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, SessionLocal
import models
from seed_data import run_seed

from routers import websocket as ws_router
from routers import incidents, ambulances, hospitals, allocation, dashboard, simulation

app = FastAPI(
    title="YUKTIK 2026",
    description="AI-Powered Emergency Coordination Platform",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static uploads ────────────────────────────────────────────────────────────
UPLOAD_DIR = "d:/YUTIK/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── WebSocket (must be before API routers so /ws is at root) ─────────────────
app.include_router(ws_router.router)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(incidents.router,   prefix="/api", tags=["Incidents"])
app.include_router(ambulances.router,  prefix="/api", tags=["Ambulances"])
app.include_router(hospitals.router,   prefix="/api", tags=["Hospitals"])
app.include_router(allocation.router,  prefix="/api", tags=["Allocation"])
app.include_router(dashboard.router,   prefix="/api", tags=["Dashboard"])
app.include_router(simulation.router,  prefix="/api", tags=["Simulation"])


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "YUKTIK 2026 Backend Running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
