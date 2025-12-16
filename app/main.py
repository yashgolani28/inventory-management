from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

from .database import init_db
from .importers import router as import_router
from .database import engine
from sqlmodel import Session, select
from .auth_routes import router as auth_router
from .routers import (
    component_router,
    credential_router,
    district_router,
    junction_box_router,
    landmark_router,
    pole_router,
    region_router,
    audit_router,
    search_router,
    excel_router,
)


def create_app() -> FastAPI:
    app = FastAPI(title="Inventory GUI API", version="0.1.0")

    # Get CORS origins from environment variable or use defaults
    cors_origins = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    ).split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    @app.on_event("startup")
    def _startup():
        init_db()

    @app.get("/")
    def root():
        return {"message": "Inventory Management API", "status": "running", "version": "0.1.0"}

    @app.get("/health")
    def health():
        return {"status": "healthy"}

    app.include_router(auth_router)
    app.include_router(region_router)
    app.include_router(district_router)
    app.include_router(landmark_router)
    app.include_router(pole_router)
    app.include_router(junction_box_router)
    app.include_router(component_router)
    app.include_router(credential_router)
    app.include_router(audit_router)
    app.include_router(search_router)
    app.include_router(excel_router)
    app.include_router(import_router)

    return app


app = create_app()

