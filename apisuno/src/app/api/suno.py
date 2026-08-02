from fastapi import APIRouter, BackgroundTasks
from src.app.models.schemas import DonationRequest
from src.app.services.suno_service import queue_donation_request, process_donation_request
from src.app.data.store import get_tasks

router = APIRouter()

@router.get("/api/health")
async def health():
    return {"status": "ok"}

@router.get("/api/tasks")
async def list_tasks():
    return [task.dict() for task in get_tasks()]

@router.post("/api/tasks")
async def create_task(request: DonationRequest, background_tasks: BackgroundTasks):
    task = queue_donation_request(request)
    background_tasks.add_task(process_donation_request, task.id)
    return task
