from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from src.app.api.suno import router as suno_api_router
from src.app.routes.ui import router as ui_router
from src.app.routes.webhook import router as webhook_router
from src.app.core.config import init_dirs, MUSIC_FOLDER

app = FastAPI(title="Live Suno Donate Music", version="0.1.0")

app.include_router(suno_api_router)
app.include_router(webhook_router)
app.include_router(ui_router)

init_dirs()
static_dir = Path(__file__).resolve().parent / "app" / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/music", StaticFiles(directory=MUSIC_FOLDER), name="music")

@app.on_event("startup")
async def startup_event():
    init_dirs()

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/control")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=True)
