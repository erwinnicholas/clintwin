import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from api.routers.api_v1 import api_router
from fastapi.middleware.cors import CORSMiddleware
from core.database import initialize_database

app = FastAPI(title="UTSA-HSC-TrialGPT API")

# Auto-initialize database schema on startup
@app.on_event("startup")
def startup_init_db():
    initialize_database()

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    # Gracefully catch ValueErrors (e.g., from dropped live feeds) to prevent 500s
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc), "error_type": "ValueError"},
    )

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount Unified API V1 Router
app.include_router(api_router, prefix="/api/v1")

# Mount the UI static files
ui_base = os.path.join(os.path.dirname(__file__), "..", "ui")
ui_dist = os.path.join(ui_base, "dist")
ui_path = ui_dist if os.path.exists(ui_dist) else ui_base

app.mount("/assets", StaticFiles(directory=os.path.join(ui_path, "assets")), name="assets") if os.path.exists(os.path.join(ui_path, "assets")) else None
app.mount("/static", StaticFiles(directory=ui_path), name="static")

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Serve the main UI dashboard."""
    with open(os.path.join(ui_path, "index.html"), "r") as f:
        return f.read()

