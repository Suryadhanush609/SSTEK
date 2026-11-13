from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
import schemas
from database import get_db
from routers.websocket import manager

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.get("/hospitals", response_model=list[schemas.HospitalResponse])
async def list_hospitals(db: Session = Depends(get_db)):
    return db.query(models.Hospital).all()


@router.get("/hospitals/{hospital_id}", response_model=schemas.HospitalResponse)
async def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital


@router.put("/hospitals/{hospital_id}/capacity")
async def update_hospital_capacity(
    hospital_id: int,
    update: schemas.HospitalCapacityUpdate,
    db: Session = Depends(get_db),
):
    hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    prev_beds = hospital.available_beds
    prev_icu = hospital.icu_available

    if update.available_beds is not None:
        hospital.available_beds = update.available_beds
    if update.icu_available is not None:
        hospital.icu_available = update.icu_available
    if update.status is not None:
        hospital.status = update.status

    # Auto-update status based on capacity
    if hospital.available_beds == 0:
        hospital.status = "full"
    elif hospital.available_beds > 0 and hospital.status == "full":
        hospital.status = "operational"

    db.commit()
    db.refresh(hospital)

    # Trigger reallocation for incidents assigned to this hospital if capacity dropped
    capacity_dropped = (
        (update.available_beds is not None and update.available_beds < prev_beds) or
        (update.icu_available is not None and update.icu_available < prev_icu)
    )
    if capacity_dropped:
        affected = db.query(models.Incident).filter(
            models.Incident.assigned_hospital_id == hospital_id,
            models.Incident.status == "active",
        ).all()
        for incident in affected:
            from services.allocator import reallocate
            ambulances = db.query(models.Ambulance).all()
            hospitals = db.query(models.Hospital).all()
            result = reallocate(incident, ambulances, hospitals, f"Hospital {hospital.name} capacity reduced")
            if result["hospital"]:
                incident.assigned_hospital_id = result["hospital"].id
            record = models.AllocationRecord(
                incident_id=incident.id,
                ambulance_id=result["ambulance"].id if result["ambulance"] else None,
                hospital_id=result["hospital"].id if result["hospital"] else None,
                estimated_time_minutes=result["eta_minutes"],
                distance_km=result["distance_km"],
                route_waypoints=result.get("waypoints"),
                allocation_reason=result["reason"],
                is_reallocated=True,
                reallocation_reason=f"Hospital {hospital.name} capacity reduced",
                created_at=_utcnow(),
            )
            db.add(record)
        db.commit()

    await manager.broadcast({
        "type": "hospital_capacity_updated",
        "hospital_id": hospital_id,
        "available_beds": hospital.available_beds,
        "icu_available": hospital.icu_available,
        "status": hospital.status,
    })

    return schemas.HospitalResponse.model_validate(hospital)
