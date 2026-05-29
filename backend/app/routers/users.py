from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.user import User, LanguageLevel

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    objective: Optional[str] = None
    preferred_schedule: Optional[str] = None
    timezone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    avatar_url: Optional[str]
    role: str
    level: Optional[str]
    objective: Optional[str]
    preferred_schedule: Optional[str]
    timezone: str
    plan: Optional[str]
    total_points: int
    streak_days: int
    is_active: bool
    is_blocked: bool

    model_config = {"from_attributes": True}


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# ─── Rotas ────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna o perfil do usuário autenticado."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    data: UserUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza perfil do usuário autenticado."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    return user


@router.post("/me/change-password")
async def change_password(
    data: PasswordChangeRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Altera senha do usuário autenticado."""
    from app.core.security import verify_password, hash_password

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )

    user.hashed_password = hash_password(data.new_password)
    return {"message": "Senha alterada com sucesso"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Faz upload do avatar do usuário para o S3."""
    import boto3
    from app.core.config import settings
    import uuid

    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas imagens JPG, PNG ou WebP são aceitas",
        )

    content = await file.read()
    ext = file.filename.split(".")[-1].lower()
    key = f"avatars/{user_id}/{uuid.uuid4()}.{ext}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=file.content_type,
    )

    cdn_url = f"{settings.AWS_CLOUDFRONT_URL}/{key}" if settings.AWS_CLOUDFRONT_URL else \
              f"https://{settings.AWS_S3_BUCKET}.s3.amazonaws.com/{key}"

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    user.avatar_url = cdn_url

    return {"avatar_url": cdn_url}


# ─── Admin: gerenciar alunos ──────────────────────────────

@router.get("/", dependencies=[Depends(require_admin)])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Lista todos os alunos com filtros opcionais."""
    query = select(User).offset(skip).limit(limit)

    if search:
        query = query.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    result = await db.execute(query)
    users = result.scalars().all()
    return users


@router.get("/{user_id}", dependencies=[Depends(require_admin)], response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Retorna dados de um usuário específico."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


@router.patch("/{user_id}/block", dependencies=[Depends(require_admin)])
async def block_user(
    user_id: int,
    reason: str = "pagamento pendente",
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Bloqueia acesso de um aluno por inadimplência."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.is_blocked = True
    user.blocked_reason = reason
    return {"message": f"Usuário #{user_id} bloqueado: {reason}"}


@router.patch("/{user_id}/unblock", dependencies=[Depends(require_admin)])
async def unblock_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Desbloqueia acesso de um aluno."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.is_blocked = False
    user.blocked_reason = None
    return {"message": f"Usuário #{user_id} desbloqueado"}


@router.patch("/{user_id}/deactivate", dependencies=[Depends(require_admin)])
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Desativa conta de um aluno."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.is_active = False
    return {"message": f"Usuário #{user_id} desativado"}
