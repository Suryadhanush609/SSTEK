from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

import models
import schemas
from database import get_db
from services.allocator import haversine
from routers.websocket import manager

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.get("/ambulances", response_model=list[schemas.AmbulanceResponse])
async def list_ambulances(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db),
):
    ambulances = db.query(models.Ambulance).all()
    result = []
    for a in ambulances:
        resp = schemas.AmbulanceResponse.model_validate(a)
        if lat is not None and lon is not None:
            resp.distance_km = round(haversine(lat, lon, a.latitude, a.longitude), 3)
        result.append(resp)
    return result


@router.put("/ambulances/{ambulance_id}/status")
async def update_ambulance_status(
    ambulance_id: int,
    update: schemas.AmbulanceStatusUpdate,
    db: Session = Depends(get_db),
):
    ambulance = db.query(models.Ambulance).filter(models.Ambulance.id == ambulance_id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    previously_available = ambulance.status == "available"
    ambulance.status = update.status
    ambulance.last_updated = _utcnow()
    db.commit()
    db.refresh(ambulance)

    # If newly unavailable and was available, trigger reallocation for affected incidents
    if update.status == "unavailable" and not previously_available is False:
        active_incidents = db.query(models.Incident).filter(
            models.Incident.assigned_ambulance_id == ambulance_id,
            models.Incident.status == "active",
        ).all()
        for incident in active_incidents:
            from services.allocator import reallocate
            ambulances = db.query(models.Ambulance).all()
            hospitals = db.query(models.Hospital).all()
            result = reallocate(incident, ambulances, hospitals, f"Ambulance {ambulance.unit_number} became unavailable")
            if result["ambulance"]:
                result["ambulance"].status = "assigned"
                result["ambulance"].current_incident_id = incident.id
                incident.assigned_ambulance_id = result["ambulance"].id
            record = models.AllocationRecord(
                incident_id=incident.id,
                ambulance_id=result["ambulance"].id if result["ambulance"] else None,
                hospital_id=result["hospital"].id if result["hospital"] else None,
                estimated_time_minutes=result["eta_minutes"],
                distance_km=result["distance_km"],
                route_waypoints=result.get("waypoints"),
                allocation_reason=result["reason"],
                is_reallocated=True,
                reallocation_reason=f"Ambulance {ambulance.unit_number} became unavailable",
                created_at=_utcnow(),
            )
            db.add(record)
            db.commit()

    await manager.broadcast({
        "type": "ambulance_status_changed",
        "ambulance_id": ambulance_id,
        "new_status": update.status,
    })

    return schemas.AmbulanceResponse.model_validate(ambulance)


@router.put("/ambulances/{ambulance_id}/location")
async def update_ambulance_location(
    ambulance_id: int,
    update: schemas.AmbulanceLocationUpdate,
    db: Session = Depends(get_db),
):
    ambulance = db.query(models.Ambulance).filter(models.Ambulance.id == ambulance_id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    ambulance.latitude = update.latitude
    ambulance.longitude = update.longitude
    ambulance.last_updated = _utcnow()
    db.commit()
    db.refresh(ambulance)

    await manager.broadcast({
        "type": "ambulance_location_updated",
        "ambulance_id": ambulance_id,
        "latitude": update.latitude,
        "longitude": update.longitude,
    })

    return schemas.AmbulanceResponse.model_validate(ambulance)
