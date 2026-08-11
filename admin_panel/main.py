from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from admin_panel.routers import applications, auth, export, positions, stats, texts

app = FastAPI(title="LAZANA HR — Admin Panel", version="1.0.0")

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(positions.router)
app.include_router(texts.router)
app.include_router(export.router)
app.include_router(stats.router)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
