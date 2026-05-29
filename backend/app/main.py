from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    if settings.is_development:
        await create_tables()
    yield
    # Shutdown
    print("👋 Encerrando servidor...")


app = FastAPI(
    title=settings.APP_NAME,
    description="API da plataforma de aulas de inglês — vitrine, área do aluno, painel admin e IA.",Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    version=settings.APP_VERSION,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ─── Middlewares ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ──────────────────────────────────────────────
from app.routers import auth, users, lessons, materials, exercises, payments, progress, ia, admin  # noqa: E402

PREFIX = "/api/v1"

app.include_router(auth.router,      prefix=f"{PREFIX}/auth",      tags=["🔐 Auth"])
app.include_router(users.router,     prefix=f"{PREFIX}/users",     tags=["👤 Usuários"])
app.include_router(lessons.router,   prefix=f"{PREFIX}/lessons",   tags=["📅 Aulas"])
app.include_router(materials.router, prefix=f"{PREFIX}/materials", tags=["📚 Materiais"])
app.include_router(exercises.router, prefix=f"{PREFIX}/exercises", tags=["✏️ Exercícios"])
app.include_router(payments.router,  prefix=f"{PREFIX}/payments",  tags=["💳 Pagamentos"])
app.include_router(progress.router,  prefix=f"{PREFIX}/progress",  tags=["📈 Progresso"])
app.include_router(ia.router,        prefix=f"{PREFIX}/ia",        tags=["🤖 IA"])
app.include_router(admin.router,     prefix=f"{PREFIX}/admin",     tags=["🛠️ Admin"])


# ─── Health Check ─────────────────────────────────────────
@app.get("/health", tags=["⚙️ Sistema"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }
