"""
Seed data for YUKTIK 2026 — Bangalore ambulances and hospitals.
Only runs if the tables are empty.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import models


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


AMBULANCES = [
    {"unit_number": "AMB-001", "latitude": 12.9352, "longitude": 77.6245, "status": "available",   "driver_name": "Rajesh Kumar"},
    {"unit_number": "AMB-002", "latitude": 12.9784, "longitude": 77.6408, "status": "available",   "driver_name": "Priya Sharma"},
    {"unit_number": "AMB-003", "latitude": 12.9698, "longitude": 77.7500, "status": "assigned",    "driver_name": "Amit Singh"},
    {"unit_number": "AMB-004", "latitude": 12.9237, "longitude": 77.5831, "status": "available",   "driver_name": "Meera Nair"},
    {"unit_number": "AMB-005", "latitude": 13.0358, "longitude": 77.5970, "status": "unavailable", "driver_name": "Suresh Reddy"},
    {"unit_number": "AMB-006", "latitude": 12.8395, "longitude": 77.6771, "status": "available",   "driver_name": "Deepa Thomas"},
    {"unit_number": "AMB-007", "latitude": 13.0271, "longitude": 77.5497, "status": "available",   "driver_name": "Kiran Patel"},
    {"unit_number": "AMB-008", "latitude": 12.9165, "longitude": 77.6101, "status": "available",   "driver_name": "Anjali Verma"},
]

HOSPITALS = [
    {
        "name": "Manipal Hospital", "latitude": 12.9591, "longitude": 77.6479,
        "total_beds": 200, "available_beds": 150, "icu_total": 30, "icu_available": 20,
        "status": "operational", "address": "HAL Airport Road, Kodihalli, Bangalore"
    },
    {
        "name": "Fortis Hospital", "latitude": 12.9516, "longitude": 77.5915,
        "total_beds": 180, "available_beds": 100, "icu_total": 25, "icu_available": 15,
        "status": "operational", "address": "Bannerghatta Road, Bangalore"
    },
    {
        "name": "Apollo Hospital", "latitude": 12.9719, "longitude": 77.6412,
        "total_beds": 250, "available_beds": 180, "icu_total": 40, "icu_available": 25,
        "status": "operational", "address": "Bannerghatta Road, Panduranga Nagar, Bangalore"
    },
    {
        "name": "Narayana Health", "latitude": 12.8440, "longitude": 77.6552,
        "total_beds": 300, "available_beds": 220, "icu_total": 50, "icu_available": 35,
        "status": "operational", "address": "258/A Bommasandra Industrial Area, Bangalore"
    },
    {
        "name": "St. John's Medical Centre", "latitude": 12.9254, "longitude": 77.6228,
        "total_beds": 160, "available_beds": 90, "icu_total": 20, "icu_available": 10,
        "status": "operational", "address": "Sarjapur Road, Koramangala, Bangalore"
    },
    {
        "name": "Victoria Hospital", "latitude": 12.9767, "longitude": 77.5713,
        "total_beds": 120, "available_beds": 60, "icu_total": 15, "icu_available": 5,
        "status": "operational", "address": "Fort Road, Krishnarajendra Market, Bangalore"
    },
]


def run_seed(db: Session):
    if db.query(models.Ambulance).count() > 0:
        return  # Already seeded

    now = _utcnow()
    for a in AMBULANCES:
        db.add(models.Ambulance(**a, last_updated=now))

    for h in HOSPITALS:
        db.add(models.Hospital(**h))

    db.commit()
    print("✅ Seed data loaded: 8 ambulances, 6 hospitals (Bangalore)")
