from fastapi import APIRouter, BackgroundTasks, Request
from src.app.models.schemas import DonationRequest
from src.app.services.suno_service import (
    queue_donation_request,
    process_donation_request,
    process_suno_callback,
)

router = APIRouter()

@router.post('/webhook/generic')
async def generic_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    donor = data.get('name') or data.get('username') or data.get('from') or 'Anônimo'
    message = data.get('message') or data.get('msg') or data.get('text') or ''
    amount = float(data.get('amount', 0) or 0)
    currency = data.get('currency', 'BRL')

    task = queue_donation_request(DonationRequest(donor=donor, message=message, amount=amount, currency=currency))
    background_tasks.add_task(process_donation_request, task.id)
    return {'status': 'ok', 'task_id': task.id}

@router.post('/webhook/streamlabs')
async def streamlabs_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    if 'message' in data and isinstance(data['message'], list):
        for item in data['message']:
            if item.get('type') == 'donation':
                donor = item.get('name', 'Anônimo')
                message = item.get('message', '')
                amount = float(item.get('amount', 0) or 0)
                task = queue_donation_request(DonationRequest(donor=donor, message=message, amount=amount, currency='BRL'))
                background_tasks.add_task(process_donation_request, task.id)
    return {'status': 'ok'}

@router.post('/webhook/streamelements')
async def streamelements_webhook(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    if data.get('type') == 'tip' or 'donation' in str(data).lower():
        donor = data.get('data', {}).get('username') or data.get('name', 'Anônimo')
        message = data.get('data', {}).get('message') or data.get('message', '')
        amount = float(data.get('data', {}).get('amount', 0) or 0)
        task = queue_donation_request(DonationRequest(donor=donor, message=message, amount=amount, currency='BRL'))
        background_tasks.add_task(process_donation_request, task.id)
    return {'status': 'ok'}


@router.post('/webhook/suno')
async def suno_webhook(request: Request):
    payload = await request.json()
    process_suno_callback(payload)
    return {'status': 'received'}
