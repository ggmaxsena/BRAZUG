from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv()

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))
SUNO_API_KEY = os.getenv("SUNO_API_KEY", "")
CALLBACK_BASE_URL = os.getenv("CALLBACK_BASE_URL", "").strip()
OBS_HOST = os.getenv("OBS_HOST", "localhost")
OBS_PORT = int(os.getenv("OBS_PORT", 4455))
OBS_PASSWORD = os.getenv("OBS_PASSWORD", "")
OBS_HOTKEY_NAME = os.getenv("OBS_HOTKEY_NAME", "").strip()
MUSIC_FOLDER = Path(os.getenv("MUSIC_FOLDER", "./musicas_geradas"))
SPOTIFY_LOCAL_FOLDER = Path(os.getenv("SPOTIFY_LOCAL_FOLDER", "./spotify_local"))


def init_dirs():
    MUSIC_FOLDER.mkdir(parents=True, exist_ok=True)
    SPOTIFY_LOCAL_FOLDER.mkdir(parents=True, exist_ok=True)
