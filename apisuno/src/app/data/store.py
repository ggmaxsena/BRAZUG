from typing import List
from src.app.models.schemas import TaskStatus, DonationTask

TASKS: List[DonationTask] = []


def get_tasks() -> List[DonationTask]:
    return TASKS


def add_task(task: DonationTask) -> DonationTask:
    TASKS.append(task)
    return task


def find_task(task_id: str) -> DonationTask | None:
    return next((task for task in TASKS if task.id == task_id), None)


def update_task(task_id: str, **fields) -> DonationTask | None:
    task = find_task(task_id)
    if not task:
        return None
    for key, value in fields.items():
        setattr(task, key, value)
    return task
