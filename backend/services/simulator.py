"""
Simulation Service — 5-step emergency scenario
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import models
from services.allocator import allocate_resources, reallocate, haversine
from services.ai_engine import classify_incident

simulation_state = {
    "active": False,
    "current_step": 0,
    "scenario_incidents": [],   # IDs of incidents A, B, C (and optionally D)
    "disruptions_applied": [],
    "traffic_multiplier": 1.0,
}

SCENARIO_INCIDENTS = [
    {
        "incident_type": "accident",
        "description": "Major vehicle collision on Outer Ring Road involving 3 cars",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "affected_people": 8,
    },
    {
        "incident_type": "medical",
        "description": "Cardiac arrest reported at MG Road metro station",
        "latitude": 12.9757,
        "longitude": 77.6065,
        "affected_people": 1,
    },
    {
        "incident_type": "fire",
        "description": "Commercial building fire at Whitefield IT park",
        "latitude": 12.9698,
        "longitude": 77.7500,
        "affected_people": 25,
    },
]


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _create_allocation(db: Session, incident, result: dict, is_reallocated=False, reallocation_reason=None):
    record = models.AllocationRecord(
        incident_id=incident.id,
        ambulance_id=result["ambulance"].id if result["ambulance"] else None,
        hospital_id=result["hospital"].id if result["hospital"] else None,
        estimated_time_minutes=result["eta_minutes"],
        distance_km=result["distance_km"],
        route_waypoints=result.get("waypoints"),
        allocation_reason=result["reason"],
        is_reallocated=is_reallocated,
        reallocation_reason=reallocation_reason,
        created_at=_utcnow(),
    )
    db.add(record)
    if result["ambulance"]:
        result["ambulance"].status = "assigned"
        result["ambulance"].current_incident_id = incident.id
    if result["ambulance"] or result["hospital"]:
        incident.assigned_ambulance_id = result["ambulance"].id if result["ambulance"] else incident.assigned_ambulance_id
        incident.assigned_hospital_id = result["hospital"].id if result["hospital"] else incident.assigned_hospital_id
    db.commit()
    db.refresh(record)
    return record


async def run_scenario_step(step: int, db: Session) -> dict:
    ambulances = db.query(models.Ambulance).all()
    hospitals = db.query(models.Hospital).all()

    if step == 0:
        # ── Step 0: Create incidents A, B, C and allocate ────────────────────
        simulation_state["active"] = True
        simulation_state["current_step"] = 0
        simulation_state["scenario_incidents"] = []
        simulation_state["disruptions_applied"] = []
        simulation_state["traffic_multiplier"] = 1.0

        changes = []
        allocations = []

        for scenario in SCENARIO_INCIDENTS:
            classification = classify_incident(
                scenario["description"], scenario["incident_type"], scenario["affected_people"]
            )
            incident = models.Incident(
                incident_type=scenario["incident_type"],
                description=scenario["description"],
                latitude=scenario["latitude"],
                longitude=scenario["longitude"],
                affected_people=scenario["affected_people"],
                severity=classification["severity"],
                priority=classification["priority"],
                status="active",
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)
            simulation_state["scenario_incidents"].append(incident.id)

            # Refresh ambulance list to pick up status changes
            ambulances = db.query(models.Ambulance).all()
            result = allocate_resources(incident, ambulances, hospitals, simulation_state["traffic_multiplier"])
            _create_allocation(db, incident, result)

            changes.append(f"Incident #{incident.id} created: {scenario['incident_type']} (severity {classification['severity']})")
            allocations.append({
                "incident_id": incident.id,
                "ambulance": result["ambulance"].unit_number if result["ambulance"] else None,
                "hospital": result["hospital"].name if result["hospital"] else None,
                "eta_minutes": result["eta_minutes"],
                "distance_km": result["distance_km"],
            })

        return {"step": 0, "description": "Scenario initialized: 3 incidents created with initial allocations.", "changes": changes, "allocations": allocations}

    elif step == 1:
        # ── Step 1: Mark nearest ambulance unavailable, trigger reallocation ─
        incident_ids = simulation_state["scenario_incidents"]
        if not incident_ids:
            return {"step": 1, "description": "No scenario active.", "changes": [], "allocations": []}

        # Pick the first active incident's assigned ambulance
        first_incident = db.query(models.Incident).filter(models.Incident.id == incident_ids[0]).first()
        target_ambulance = None
        if first_incident and first_incident.assigned_ambulance_id:
            target_ambulance = db.query(models.Ambulance).filter(
                models.Ambulance.id == first_incident.assigned_ambulance_id
            ).first()

        changes = []
        if target_ambulance:
            target_ambulance.status = "unavailable"
            target_ambulance.current_incident_id = None
            db.commit()
            changes.append(f"Ambulance {target_ambulance.unit_number} marked unavailable (simulated breakdown)")
            simulation_state["disruptions_applied"].append(f"ambulance_{target_ambulance.id}_unavailable")

            # Reallocation
            ambulances = db.query(models.Ambulance).all()
            result = reallocate(first_incident, ambulances, hospitals, "Ambulance became unavailable — reallocation triggered", simulation_state["traffic_multiplier"])
            first_incident.assigned_ambulance_id = result["ambulance"].id if result["ambulance"] else first_incident.assigned_ambulance_id
            db.commit()
            record = _create_allocation(db, first_incident, result, is_reallocated=True, reallocation_reason="Ambulance breakdown")
            alloc = {
                "incident_id": first_incident.id,
                "ambulance": result["ambulance"].unit_number if result["ambulance"] else None,
                "hospital": result["hospital"].name if result["hospital"] else None,
                "eta_minutes": result["eta_minutes"],
                "distance_km": result["distance_km"],
                "reallocation": True,
            }
        else:
            alloc = {}
            changes.append("No assigned ambulance found for reallocation test")

        simulation_state["current_step"] = 1
        return {"step": 1, "description": "Disruption: Ambulance unavailable. Reallocation triggered.", "changes": changes, "allocations": [alloc]}

    elif step == 2:
        # ── Step 2: Set selected hospital ICU to 0, trigger reallocation ─────
        incident_ids = simulation_state["scenario_incidents"]
        second_incident = db.query(models.Incident).filter(models.Incident.id == incident_ids[1]).first() if len(incident_ids) > 1 else None
        changes = []
        alloc = {}

        if second_incident and second_incident.assigned_hospital_id:
            target_hospital = db.query(models.Hospital).filter(
                models.Hospital.id == second_incident.assigned_hospital_id
            ).first()
            if target_hospital:
                target_hospital.icu_available = 0
                db.commit()
                changes.append(f"Hospital {target_hospital.name} ICU set to 0 (capacity exhausted)")
                simulation_state["disruptions_applied"].append(f"hospital_{target_hospital.id}_icu_zero")

                ambulances = db.query(models.Ambulance).all()
                hospitals = db.query(models.Hospital).all()
                result = reallocate(second_incident, ambulances, hospitals, "Hospital ICU capacity exhausted — finding alternative", simulation_state["traffic_multiplier"])
                second_incident.assigned_hospital_id = result["hospital"].id if result["hospital"] else second_incident.assigned_hospital_id
                db.commit()
                _create_allocation(db, second_incident, result, is_reallocated=True, reallocation_reason="ICU capacity exhausted")
                alloc = {
                    "incident_id": second_incident.id,
                    "ambulance": result["ambulance"].unit_number if result["ambulance"] else None,
                    "hospital": result["hospital"].name if result["hospital"] else None,
                    "eta_minutes": result["eta_minutes"],
                    "distance_km": result["distance_km"],
                    "reallocation": True,
                }
        else:
            changes.append("No hospital found for ICU disruption test")

        simulation_state["current_step"] = 2
        return {"step": 2, "description": "Disruption: Hospital ICU exhausted. Hospital reallocation triggered.", "changes": changes, "allocations": [alloc]}

    elif step == 3:
        # ── Step 3: Traffic surge — ETA multiplier 1.5x ───────────────────────
        simulation_state["traffic_multiplier"] = 1.5
        simulation_state["disruptions_applied"].append("traffic_surge_1.5x")
        changes = ["Traffic surge detected — ETA multiplier applied (1.5x)"]
        alloc_updates = []

        for inc_id in simulation_state["scenario_incidents"]:
            incident = db.query(models.Incident).filter(models.Incident.id == inc_id).first()
            if not incident:
                continue
            ambulances = db.query(models.Ambulance).all()
            hospitals = db.query(models.Hospital).all()
            result = reallocate(incident, ambulances, hospitals, "Traffic surge: ETA recalculated at 1.5x", simulation_state["traffic_multiplier"])
            _create_allocation(db, incident, result, is_reallocated=True, reallocation_reason="Traffic surge")
            alloc_updates.append({
                "incident_id": incident.id,
                "ambulance": result["ambulance"].unit_number if result["ambulance"] else None,
                "hospital": result["hospital"].name if result["hospital"] else None,
                "eta_minutes": result["eta_minutes"],
                "distance_km": result["distance_km"],
                "note": "ETA increased by 1.5x due to traffic",
            })
            changes.append(f"Incident #{inc_id}: ETA updated to {result['eta_minutes']:.1f} min")

        simulation_state["current_step"] = 3
        return {"step": 3, "description": "Traffic surge: all ETAs increased by 1.5x, allocations updated.", "changes": changes, "allocations": alloc_updates}

    elif step == 4:
        # ── Step 4: Mass-casualty 4th emergency ──────────────────────────────
        classification = classify_incident("Mass casualty event — building collapse with 50+ trapped", "accident", 50)
        incident = models.Incident(
            incident_type="accident",
            description="Mass casualty event — building collapse with 50+ trapped",
            latitude=12.9500,
            longitude=77.6300,
            affected_people=50,
            severity=5,
            priority="critical",
            status="active",
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        simulation_state["scenario_incidents"].append(incident.id)

        ambulances = db.query(models.Ambulance).all()
        hospitals = db.query(models.Hospital).all()
        result = allocate_resources(incident, ambulances, hospitals, simulation_state["traffic_multiplier"])
        _create_allocation(db, incident, result)

        changes = [
            f"Mass-casualty incident #{incident.id} created (50 affected, severity 5)",
            f"All available resources allocated",
        ]
        alloc = {
            "incident_id": incident.id,
            "ambulance": result["ambulance"].unit_number if result["ambulance"] else None,
            "hospital": result["hospital"].name if result["hospital"] else None,
            "eta_minutes": result["eta_minutes"],
            "distance_km": result["distance_km"],
            "note": "Mass casualty — multiple units may be needed",
        }

        simulation_state["current_step"] = 4
        return {"step": 4, "description": "Mass-casualty 4th emergency created. Remaining resources allocated.", "changes": changes, "allocations": [alloc]}

    return {"step": step, "description": "Unknown step", "changes": [], "allocations": []}
