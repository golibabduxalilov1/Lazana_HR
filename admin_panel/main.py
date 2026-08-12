from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from admin_panel.routers import applications, auth, employees, export, positions, stats, texts

app = FastAPI(title="LAZANA HR — Admin Panel", version="1.0.0")

app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(positions.router)
app.include_router(texts.router)
app.include_router(export.router)
app.include_router(stats.router)
app.include_router(employees.router)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")

else:
    STATIC_DIR = Path(__file__).parent / "static"
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
