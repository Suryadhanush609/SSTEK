from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
import aiofiles
import os

import models
import schemas
from database import get_db
from services.ai_engine import classify_incident
from services.allocator import allocate_resources
from routers.websocket import manager

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _do_allocate(incident: models.Incident, db: Session) -> Optional[models.AllocationRecord]:
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
        is_reallocated=result.get("is_reallocated", False),
        reallocation_reason=result.get("reallocation_reason"),
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
    return record


@router.post("/incidents/report")
async def report_incident(
    incident_type: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    affected_people: int = Form(1),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    image_path = None
    if image and image.filename:
        upload_dir = "d:/YUTIK/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, image.filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await image.read()
            await f.write(content)
        image_path = f"/uploads/{image.filename}"

    classification = classify_incident(description, incident_type, affected_people)

    incident = models.Incident(
        incident_type=incident_type,
        description=description,
        latitude=latitude,
        longitude=longitude,
        affected_people=affected_people,
        severity=classification["severity"],
        priority=classification["priority"],
        status="active",
        image_path=image_path,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    allocation = await _do_allocate(incident, db)

    # Alert
    alert = models.Alert(
        message=f"New {incident.priority.upper()} incident reported: {incident_type} at ({latitude:.4f}, {longitude:.4f}). Severity {incident.severity}/5.",
        alert_type="critical" if incident.priority == "critical" else "warning",
        created_at=_utcnow(),
    )
    db.add(alert)
    db.commit()

    # Broadcast
    await manager.broadcast({
        "type": "new_incident",
        "incident_id": incident.id,
        "severity": incident.severity,
        "priority": incident.priority,
        "incident_type": incident_type,
        "allocation_reason": allocation.allocation_reason if allocation else None,
    })

    return {
        "incident": schemas.IncidentResponse.model_validate(incident),
        "classification": classification,
        "allocation": schemas.AllocationRecordResponse.model_validate(allocation) if allocation else None,
    }


@router.get("/incidents", response_model=list[schemas.IncidentResponse])
async def list_incidents(
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Incident)
    if status:
        query = query.filter(models.Incident.status == status)
    if incident_type:
        query = query.filter(models.Incident.incident_type == incident_type)
    return query.order_by(models.Incident.created_at.desc()).all()


@router.get("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
async def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.put("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: int,
    update: schemas.IncidentUpdate,
    db: Session = Depends(get_db),
):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if update.status:
        incident.status = update.status
    if update.severity is not None:
        incident.severity = update.severity
    if update.priority:
        incident.priority = update.priority
    if update.description:
        incident.description = update.description
    incident.updated_at = _utcnow()

    db.commit()
    db.refresh(incident)

    if update.status == "resolved" and incident.assigned_ambulance_id:
        amb = db.query(models.Ambulance).filter(models.Ambulance.id == incident.assigned_ambulance_id).first()
        if amb:
            amb.status = "available"
            amb.current_incident_id = None
            db.commit()

    await manager.broadcast({
        "type": "incident_updated",
        "incident_id": incident_id,
        "new_status": incident.status,
    })

    return schemas.IncidentResponse.model_validate(incident)
