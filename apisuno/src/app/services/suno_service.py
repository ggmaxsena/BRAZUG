import random
import time
import requests
import asyncio
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from urllib.parse import quote
from typing import Any

from src.app.core.config import (
    SUNO_API_KEY,
    MUSIC_FOLDER,
    SPOTIFY_LOCAL_FOLDER,
    CALLBACK_BASE_URL,
    OBS_HOST,
    OBS_PORT,
    OBS_PASSWORD,
    OBS_HOTKEY_NAME,
)
from src.app.data.store import add_task, update_task, find_task
from src.app.models.schemas import DonationRequest, DonationTask, TaskStatus

VOZES = [
    "feminina grave",
    "feminina ópera",
    "feminina pop",
    "masculina soprano",
    "masculina ópera",
    "masculina pop",
]

ESTRUTURAS = [
    "progressão Fibonacci",
    "compasso 13/8",
    "compasso 2/2",
    "compasso 4/4",
    "compasso 32/16",
    "grandes pausas a cada 8 compassos",
]

STYLES_D20 = [
    "Brazilian Funk",
    "Funk Ostentação",
    "Trap Brasileiro",
    "Phonk",
    "Drill",
    "Sertanejo Universitário",
    "Pagode",
    "Forró Eletrônico",
    "MPB",
    "Rock Nacional",
    "Lo-fi Hip Hop",
    "Electronic Dance",
    "Afrobeats",
    "Reggaeton",
    "R&B",
    "Hyperpop",
    "Metal Melódico",
    "Jazz Fusion",
    "Synthwave",
    "Indie Folk",
]

MODELS = ["V4_5ALL", "V4_5", "V5", "V4_5PLUS"]

BRAZUG_MASTER_PROMPT = """Escreva uma música original sobre o universo da guilda BRAZUG, ambientada em World of Warcraft Classic Hardcore (Horda). A música deve transmitir camaradagem, coragem, honra, sacrifício, perseverança e o espírito 'Keep Zuggin'. A letra deve parecer um hino da guilda, misturando momentos épicos, humor interno e referências ao jogo sem depender de memes passageiros.

Características:
- Universo: WoW Classic Hardcore.
- Facção: Horda.
- Tema central: [TEMA].
- Narrativa cinematográfica.
- Linguagem simples, forte e fácil de cantar.
- Refrão extremamente memorável.
- Versos rimados.
- Estrutura:
  - Intro
  - Verso 1
  - Pré-Refrão
  - Refrão
  - Verso 2
  - Ponte
  - Refrão Final
  - Outro

A música deve criar imagens mentais, mencionar lugares, criaturas, perigos e jornadas do WoW Classic sem parecer apenas uma lista de referências.

Evite linguagem moderna ou tecnológica. Tudo deve soar como uma saga vivida pelos aventureiros da Horda."""


def roll_dice() -> dict:
    d6_voz = random.randint(1, 6)
    d6_estrutura = random.randint(1, 6)
    d20_a = random.randint(1, 20)
    d20_b = random.randint(1, 20)

    voz = VOZES[d6_voz - 1]
    estrutura = ESTRUTURAS[d6_estrutura - 1]
    estilo_a = STYLES_D20[d20_a - 1]
    estilo_b = STYLES_D20[d20_b - 1]

    return {
        "d6_voz": d6_voz,
        "d6_estrutura": d6_estrutura,
        "d20_a": d20_a,
        "d20_b": d20_b,
        "voz": voz,
        "estrutura": estrutura,
        "estilo_a": estilo_a,
        "estilo_b": estilo_b,
        "mix": f"{estilo_a} + {estilo_b}",
    }


def generate_prompt(donor: str, message: str, dados: dict) -> str:
    tema = message.strip() if message and message.strip() else f"a jornada do doador {donor}"
    base_prompt = BRAZUG_MASTER_PROMPT.replace("[TEMA]", tema)

    prompt = (
        f"{base_prompt}\n\nContexto adicional de produção:\n"
        f"- Mistura de estilos: {dados['mix']}.\n"
        f"- Voz: {dados['voz']}.\n"
        f"- Estrutura rítmica: {dados['estrutura']}.\n"
        f"- Dedicada ao doador {donor}."
    )

    return prompt[:500]


def queue_donation_request(request: DonationRequest) -> DonationTask:
    task = DonationTask(
        id=str(uuid4()),
        donor=request.donor,
        message=request.message,
        amount=request.amount,
        currency=request.currency,
        status=TaskStatus.pending,
    )
    add_task(task)
    return task


def extract_audio_tracks(payload: dict[str, Any]) -> list[dict[str, Any]]:
    response = payload.get("data", {}).get("response", {})
    suno_data = response.get("sunoData") or response.get("data") or []
    if isinstance(suno_data, list):
        return [track for track in suno_data if isinstance(track, dict)]
    return []


def process_suno_callback(payload: dict[str, Any]) -> None:
    callback_data = payload.get("data", {}) or {}
    task_id = callback_data.get("task_id") or payload.get("task_id")
    if not task_id:
        return

    task = find_task(task_id)
    if not task:
        return

    if payload.get("code") != 200:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason=payload.get("msg") or "Callback reportou falha",
            updated_at=datetime.utcnow(),
        )
        return

    tracks = []
    for item in callback_data.get("data") or []:
        if isinstance(item, dict):
            tracks.append(item)

    if not tracks:
        tracks = extract_audio_tracks(payload)

    if not tracks:
        update_task(task_id, status=TaskStatus.failed, failure_reason="Callback sem dados de áudio", updated_at=datetime.utcnow())
        return

    first_track = tracks[0]
    audio_url = first_track.get("audio_url") or first_track.get("audioUrl") or first_track.get("url")
    title = first_track.get("title") or first_track.get("title") or "musica_da_doacao"
    if not audio_url:
        update_task(task_id, status=TaskStatus.failed, failure_reason="Callback não retornou URL de áudio", updated_at=datetime.utcnow())
        return

    file_path = download_and_save(audio_url, title, task.donor)
    if not file_path:
        update_task(task_id, status=TaskStatus.failed, failure_reason="Falha ao baixar o áudio recebido por callback", updated_at=datetime.utcnow())
        return

    encoded_name = quote(file_path.name)
    update_task(
        task_id,
        status=TaskStatus.success,
        result_url=f"/music/{encoded_name}",
        filename=file_path.name,
        updated_at=datetime.utcnow(),
    )


async def process_donation_request(task_id: str):
    task = find_task(task_id)
    if not task:
        return

    task.status = TaskStatus.running
    task.updated_at = datetime.utcnow()
    update_task(task_id, status=TaskStatus.running, updated_at=task.updated_at)

    dados = roll_dice()
    model = random.choice(MODELS)
    prompt = generate_prompt(task.donor, task.message, dados)

    update_task(
        task_id,
        style=dados["mix"],
        model=model,
        prompt=prompt,
        voice=dados["voz"],
        structure=dados["estrutura"],
        dice_summary=f"d6 voz={dados['d6_voz']} | d6 estrutura={dados['d6_estrutura']} | d20 A={dados['d20_a']} | d20 B={dados['d20_b']}",
        updated_at=datetime.utcnow(),
    )

    if not SUNO_API_KEY:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason="SUNO_API_KEY não está configurado",
            updated_at=datetime.utcnow(),
        )
        return

    task_data = await call_suno(prompt, model)
    if not task_data or (isinstance(task_data, dict) and "error" in task_data):
        error_message = task_data.get("error") if isinstance(task_data, dict) else "Falha na chamada à API da Suno"
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason=error_message,
            updated_at=datetime.utcnow(),
        )
        return

    task_id_suno = task_data.get("taskId") or task_data.get("task_id")
    if not task_id_suno:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason="taskId não encontrado na resposta da Suno",
            updated_at=datetime.utcnow(),
        )
        return

    audio_info = await wait_for_music(task_id_suno)
    if not audio_info:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason="Geração de áudio não foi concluída ou falhou",
            updated_at=datetime.utcnow(),
        )
        return

    tracks = audio_info[0] if isinstance(audio_info, list) and audio_info else audio_info
    if isinstance(tracks, list):
        track = tracks[0] if tracks else {}
    elif isinstance(tracks, dict):
        track = tracks
    else:
        track = {}

    audio_url = track.get("audio_url") or track.get("audioUrl") or track.get("url")
    title = track.get("title") or track.get("model_name") or "musica_da_doacao"

    if not audio_url:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason="URL de áudio não encontrada na resposta da geração",
            updated_at=datetime.utcnow(),
        )
        return

    file_path = download_and_save(audio_url, title, task.donor)
    if not file_path:
        update_task(
            task_id,
            status=TaskStatus.failed,
            failure_reason="Falha ao baixar ou salvar o arquivo de áudio",
            updated_at=datetime.utcnow(),
        )
        return

    encoded_name = quote(file_path.name)
    result_url = f"/music/{encoded_name}"
    update_task(
        task_id,
        status=TaskStatus.success,
        result_url=result_url,
        filename=file_path.name,
        updated_at=datetime.utcnow(),
    )

    obs_error = trigger_obs_hotkey()
    if obs_error:
        update_task(task_id, failure_reason=obs_error, updated_at=datetime.utcnow())


async def call_suno(prompt: str, model: str) -> dict | None:
    if not CALLBACK_BASE_URL:
        return {
            "error": "CALLBACK_BASE_URL não está configurado. Configure CALLBACK_BASE_URL no .env para receber callbacks da Suno.",
            "code": None,
        }

    url = "https://api.sunoapi.org/api/v1/generate"
    headers = {
        "Authorization": f"Bearer {SUNO_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "customMode": False,
        "instrumental": False,
        "model": model,
        "callBackUrl": CALLBACK_BASE_URL.rstrip("/") + "/webhook/generic",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") == 200:
            return data.get("data")
        return {"error": data.get("msg") or "Erro desconhecido da Suno", "code": data.get("code")}
    except Exception as exc:
        return {"error": str(exc), "code": None}


async def wait_for_music(task_id: str, max_wait: int = 300):
    url = f"https://api.sunoapi.org/api/v1/generate/record-info?taskId={task_id}"
    headers = {"Authorization": f"Bearer {SUNO_API_KEY}"}
    start = time.time()

    while time.time() - start < max_wait:
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if data.get("code") == 200:
                payload = data.get("data", {})
                status = payload.get("status")
                if status == "SUCCESS":
                    response = payload.get("response", {})
                    return response.get("data") or response.get("result") or response
                if status in ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_ERROR"]:
                    return None
        except Exception:
            pass

        await asyncio.sleep(12)
    return None


def download_and_save(audio_url: str, title: str, donor: str) -> Path | None:
    try:
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()[:50]
        safe_donor = "".join(c for c in donor if c.isalnum() or c in " -_").strip()[:30]
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_donor}_{safe_title}.mp3"
        path_live = MUSIC_FOLDER / filename
        path_spotify = SPOTIFY_LOCAL_FOLDER / filename

        resp = requests.get(audio_url, timeout=60)
        resp.raise_for_status()

        path_live.write_bytes(resp.content)
        path_spotify.write_bytes(resp.content)
        return path_live
    except Exception:
        return None


def trigger_obs_hotkey() -> str | None:
    if not OBS_HOTKEY_NAME:
        return None

    try:
        from obsws_python import ReqClient

        with ReqClient(host=OBS_HOST, port=OBS_PORT, password=OBS_PASSWORD) as client:
            client.trigger_hotkey_by_name(OBS_HOTKEY_NAME)
    except Exception as exc:
        return f"Aviso OBS: Erro ao acionar hotkey '{OBS_HOTKEY_NAME}': {exc}"

    return None
