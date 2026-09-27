from pathlib import Path

from fastapi import (
    FastAPI,
    HTTPException,
    Request,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from fastapi.responses import HTMLResponse

from fastapi.staticfiles import (
    StaticFiles,
)

from fastapi.templating import (
    Jinja2Templates,
)

from app.api import (
    auth,
    history,
    planners,
)

from app.core.config import (
    get_settings,
)

from app.db.session import (
    Base,
    engine,
)


settings = get_settings()

BASE_DIR = Path(
    __file__
).resolve().parent

templates = Jinja2Templates(
    directory=str(
        BASE_DIR / "templates"
    )
)


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "GenAI budget and "
        "recommendation assistant"
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os 
os.makedirs("app/static",exist_ok=True)
app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static",
)
app.on_event("startup")
def startup():

    Base.metadata.create_all(
        bind=engine
    )

    Path("uploads").mkdir(
        exist_ok=True
    )


#from app.auth import router as auth_router
#app.include_router(auth.router)

# app.include_router(planners.router)



# app include_router(
# history.router
# )


app.get("/health")
def health():

    return {
        "status": "ok",
        "service": settings.app_name,
        "ai_configured": bool(
            settings.gemini_api_key
        ),
    }


app.get(
    "/",
    response_class=HTMLResponse,
)
def home_page(
    request: Request,
):

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request
        },
    )


@app.get(
    "/login",
    response_class=HTMLResponse,
)
def login_page(
    request: Request,
):

    return templates.TemplateResponse(
        "login.html",
        {
            "request": request
        },
    )


@app.get(
    "/register",
    response_class=HTMLResponse,
)
def register_page(
    request: Request,
):

    return templates.TemplateResponse(
        "register.html",
        {
            "request": request
        },
    )


@app.get(
    "/dashboard",
    response_class=HTMLResponse,
)
def dashboard_page(
    request: Request,
):

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request
        },
    )


@app.get(
    "/planner/{planner}",
    response_class=HTMLResponse,
)
def planner_page(
    request: Request,
    planner: str,
):

    if planner not in {
        "home",
        "party",
        "jewelry",
    }:

        raise HTTPException(
            404,
            "Planner not found",
        )

    return templates.TemplateResponse(
        f"{planner}_planner.html",
        {
            "request": request,
            "planner": planner,
        },
    )