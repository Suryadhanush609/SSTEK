from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
from database import get_db
from services.simulator import simulation_state, run_scenario_step

router = APIRouter()


@router.post("/simulation/scenario", response_model=schemas.SimulationStepResult)
async def start_scenario(db: Session = Depends(get_db)):
    result = await run_scenario_step(0, db)
    return schemas.SimulationStepResult(**result)


@router.post("/simulation/step", response_model=schemas.SimulationStepResult)
async def advance_step(db: Session = Depends(get_db)):
    next_step = simulation_state["current_step"] + 1
    if next_step > 4:
        return schemas.SimulationStepResult(
            step=next_step,
            description="Simulation complete — all 5 steps executed.",
            changes=[],
            allocations=[],
        )
    result = await run_scenario_step(next_step, db)
    return schemas.SimulationStepResult(**result)


@router.get("/simulation/state")
async def get_simulation_state():
    return simulation_state


@router.post("/simulation/reset")
async def reset_simulation():
    simulation_state["active"] = False
    simulation_state["current_step"] = 0
    simulation_state["scenario_incidents"] = []
    simulation_state["disruptions_applied"] = []
    simulation_state["traffic_multiplier"] = 1.0
    return {"message": "Simulation state reset successfully"}
