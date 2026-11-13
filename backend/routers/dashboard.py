from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter()


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    total_active = db.query(models.Incident).filter(models.Incident.status == "active").count()
    critical_count = db.query(models.Incident).filter(
        models.Incident.status == "active",
        models.Incident.priority == "critical"
    ).count()
    available_ambulances = db.query(models.Ambulance).filter(models.Ambulance.status == "available").count()
    total_ambulances = db.query(models.Ambulance).count()
    total_hospitals = db.query(models.Hospital).count()

    hosp_stats = db.query(models.Hospital).filter(models.Hospital.status != "closed").all()
    available_beds = sum(h.available_beds for h in hosp_stats)
    available_icu = sum(h.icu_available for h in hosp_stats)

    return schemas.DashboardStats(
        total_active_incidents=total_active,
        critical_count=critical_count,
        available_ambulances=available_ambulances,
        available_hospital_beds=available_beds,
        available_icu_beds=available_icu,
        total_ambulances=total_ambulances,
        total_hospitals=total_hospitals,
    )


@router.get("/dashboard/alerts", response_model=list[schemas.AlertResponse])
async def get_alerts(db: Session = Depends(get_db)):
    return (
        db.query(models.Alert)
        .order_by(models.Alert.created_at.desc())
        .limit(50)
        .all()
    )


@router.put("/dashboard/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return schemas.AlertResponse.model_validate(alert)
