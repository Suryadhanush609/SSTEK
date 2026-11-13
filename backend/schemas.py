from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# ── Incident schemas ──────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    incident_type: str  # accident/medical/fire/flood
    description: str
    latitude: float
    longitude: float
    affected_people: int = 1
    image_path: Optional[str] = None


class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[int] = None
    priority: Optional[str] = None
    description: Optional[str] = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_type: str
    description: str
    latitude: float
    longitude: float
    severity: int
    status: str
    affected_people: int
    priority: str
    assigned_ambulance_id: Optional[int] = None
    assigned_hospital_id: Optional[int] = None
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Ambulance schemas ─────────────────────────────────────────────────────────

class AmbulanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_number: str
    latitude: float
    longitude: float
    status: str
    driver_name: str
    current_incident_id: Optional[int] = None
    last_updated: Optional[datetime] = None
    distance_km: Optional[float] = None  # computed on request


class AmbulanceStatusUpdate(BaseModel):
    status: str


class AmbulanceLocationUpdate(BaseModel):
    latitude: float
    longitude: float


# ── Hospital schemas ──────────────────────────────────────────────────────────

class HospitalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    latitude: float
    longitude: float
    total_beds: int
    available_beds: int
    icu_total: int
    icu_available: int
    status: str
    address: str


class HospitalCapacityUpdate(BaseModel):
    available_beds: Optional[int] = None
    icu_available: Optional[int] = None
    status: Optional[str] = None


# ── Allocation schemas ────────────────────────────────────────────────────────

class AllocationRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incident_id: int
    ambulance_id: Optional[int] = None
    hospital_id: Optional[int] = None
    estimated_time_minutes: float
    distance_km: float
    route_waypoints: Optional[str] = None
    allocation_reason: str
    created_at: datetime
    is_reallocated: bool
    reallocation_reason: Optional[str] = None


# ── Alert schemas ─────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message: str
    alert_type: str
    is_read: bool
    created_at: datetime


# ── Dashboard schemas ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_active_incidents: int
    critical_count: int
    available_ambulances: int
    available_hospital_beds: int
    available_icu_beds: int
    total_ambulances: int
    total_hospitals: int


# ── Simulation schemas ────────────────────────────────────────────────────────

class SimulationStepResult(BaseModel):
    step: int
    description: str
    changes: List[str]
    allocations: List[dict]
