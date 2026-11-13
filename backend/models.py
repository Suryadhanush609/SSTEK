from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_type = Column(String, nullable=False)  # accident/medical/fire/flood
    description = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity = Column(Integer, nullable=False, default=3)  # 1-5
    status = Column(String, nullable=False, default="active")  # active/resolved/pending
    affected_people = Column(Integer, nullable=False, default=1)
    priority = Column(String, nullable=False, default="medium")  # critical/high/medium/low
    assigned_ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    assigned_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    allocation_records = relationship("AllocationRecord", back_populates="incident")


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String, nullable=False, unique=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="available")  # available/assigned/unavailable
    driver_name = Column(String, nullable=False)
    current_incident_id = Column(Integer, nullable=True)
    last_updated = Column(DateTime, default=utcnow, onupdate=utcnow)


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_beds = Column(Integer, nullable=False)
    available_beds = Column(Integer, nullable=False)
    icu_total = Column(Integer, nullable=False)
    icu_available = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="operational")  # operational/full/closed
    address = Column(String, nullable=False)


class AllocationRecord(Base):
    __tablename__ = "allocation_records"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    ambulance_id = Column(Integer, nullable=True)
    hospital_id = Column(Integer, nullable=True)
    estimated_time_minutes = Column(Float, nullable=False, default=0.0)
    distance_km = Column(Float, nullable=False, default=0.0)
    route_waypoints = Column(String, nullable=True)  # JSON string
    allocation_reason = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    is_reallocated = Column(Boolean, default=False)
    reallocation_reason = Column(String, nullable=True)

    incident = relationship("Incident", back_populates="allocation_records")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    alert_type = Column(String, nullable=False, default="info")  # info/warning/critical
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
