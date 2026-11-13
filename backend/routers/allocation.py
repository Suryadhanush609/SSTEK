from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

import models
import schemas
from database import get_db
from services.allocator import allocate_resources
from routers.websocket import manager

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/allocation/trigger/{incident_id}")
async def trigger_allocation(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    ambulances = db.query(models.Ambulance).all()
    hospitals = db.query(models.Hospital).all()
    result = allocate_resources(incident, ambulances, hospitals)

    record = models.AllocationRecord(
        incident_id=incident.id,
        ambulance_id=result["ambulance"].id if result["ambulance"] else None,
        hospital_id=result["hospital"].id if result["hospital"] else None,
        estimated_time_minutes=result["eta_minutes"],
        distance_km=result["distance_km"],
        route_waypoints=result.get("waypoints"),
        allocation_reason=result["reason"],
        is_reallocated=False,
        created_at=_utcnow(),
    )
    db.add(record)

    if result["ambulance"]:
        result["ambulance"].status = "assigned"
        result["ambulance"].current_incident_id = incident.id
        incident.assigned_ambulance_id = result["ambulance"].id
    if result["hospital"]:
        incident.assigned_hospital_id = result["hospital"].id

    db.commit()
    db.refresh(record)

    await manager.broadcast({
        "type": "allocation_triggered",
        "incident_id": incident_id,
        "ambulance_id": record.ambulance_id,
        "hospital_id": record.hospital_id,
    })

    return schemas.AllocationRecordResponse.model_validate(record)


@router.get("/allocation/records", response_model=list[schemas.AllocationRecordResponse])
async def get_allocation_records(db: Session = Depends(get_db)):
    return db.query(models.AllocationRecord).order_by(models.AllocationRecord.created_at.desc()).all()


@router.get("/allocation/active", response_model=list[schemas.AllocationRecordResponse])
async def get_active_allocations(db: Session = Depends(get_db)):
    active_incident_ids = [
        i.id for i in db.query(models.Incident).filter(models.Incident.status == "active").all()
    ]
    if not active_incident_ids:
        return []
    # Latest allocation per active incident
    records = []
    for inc_id in active_incident_ids:
        rec = (
            db.query(models.AllocationRecord)
            .filter(models.AllocationRecord.incident_id == inc_id)
            .order_by(models.AllocationRecord.created_at.desc())
            .first()
        )
        if rec:
            records.append(rec)
    return records
