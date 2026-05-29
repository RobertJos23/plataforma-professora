from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.material import Material, MaterialAccess, MaterialType, LanguageLevel
from app.models.user import User

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class MaterialCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    material_type: MaterialType
    level: LanguageLevel = LanguageLevel.ALL
    tags: Optional[str] = None
    external_url: Optional[str] = None
    is_free: bool = False
    required_plan: Optional[str] = None
    duration_seconds: Optional[int] = None


class MaterialResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    material_type: str
    level: str
    tags: Optional[str]
    file_url: Optional[str]
    external_url: Optional[str]
    thumbnail_url: Optional[str]
    is_free: bool
    is_published: bool
    duration_seconds: Optional[int]
    download_count: int
    view_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Helpers ──────────────────────────────────────────────

async def _check_material_access(user: User, material: Material) -> bool:
    """Verifica se o aluno tem acesso ao material."""
    # Admin sempre tem acesso
    if user.role == "admin":
        return True
    # Material gratuito — verificar expiração
    if material.is_free:
        if material.expires_at and material.expires_at < datetime.now(timezone.utc):
            return False
        return True
    # Verificar plano do aluno
    if material.required_plan:
        plan_hierarchy = {"basic": 1, "standard": 2, "premium": 3}
        user_level = plan_hierarchy.get(user.plan or "", 0)
        required_level = plan_hierarchy.get(material.required_plan, 0)
        return user_level >= required_level
    return True


# ─── Rotas públicas / aluno ───────────────────────────────

@router.get("/", response_model=list[MaterialResponse])
async def list_materials(
    level: Optional[str] = None,
    material_type: Optional[str] = None,
    is_free: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 30,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Lista materiais disponíveis para o aluno."""
    # Buscar usuário para verificar plano
    user_result = await db.execute(select(User).where(User.id == user_id))
    current_user = user_result.scalar_one_or_none()

    query = select(Material).where(Material.is_published == True)  # noqa: E712

    if level:
        query = query.where(
            (Material.level == level) | (Material.level == LanguageLevel.ALL)
        )
    if material_type:
        query = query.where(Material.material_type == material_type)
    if is_free is not None:
        query = query.where(Material.is_free == is_free)
    if search:
        query = query.where(
            Material.title.ilike(f"%{search}%") | Material.description.ilike(f"%{search}%")
        )

    query = query.offset(skip).limit(limit).order_by(Material.created_at.desc())
    result = await db.execute(query)
    materials = result.scalars().all()

    # Filtrar por acesso (Hard Code)
    accessible = [m for m in materials if await _check_material_access(current_user, m)]
    return accessible


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna detalhes de um material e registra acesso."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    current_user = user_result.scalar_one_or_none()

    result = await db.execute(
        select(Material).where(
            and_(Material.id == material_id, Material.is_published == True)  # noqa: E712
        )
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    # Verificar acesso (Hard Code)
    if not await _check_material_access(current_user, material):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu plano não inclui acesso a este material",
        )

    # Registrar acesso
    access = MaterialAccess(user_id=user_id, material_id=material_id)
    db.add(access)
    material.view_count += 1

    return material


@router.get("/{material_id}/download")
async def download_material(
    material_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna URL assinada para download do material (S3 pre-signed URL)."""
    import boto3
    from app.core.config import settings

    user_result = await db.execute(select(User).where(User.id == user_id))
    current_user = user_result.scalar_one_or_none()

    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    if not await _check_material_access(current_user, material):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado")

    if not material.file_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este material não possui arquivo para download",
        )

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    signed_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": material.file_key},
        ExpiresIn=3600,  # válido por 1 hora
    )

    material.download_count += 1
    return {"download_url": signed_url, "expires_in": 3600}


# ─── Admin: gerenciar materiais ───────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=MaterialResponse)
async def create_material(
    data: MaterialCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Cria novo material (sem arquivo — use /upload para enviar o arquivo)."""
    teacher_id = int(admin["sub"])

    material = Material(
        teacher_id=teacher_id,
        title=data.title,
        description=data.description,
        material_type=data.material_type,
        level=data.level,
        tags=data.tags,
        external_url=data.external_url,
        is_free=data.is_free,
        required_plan=data.required_plan,
        duration_seconds=data.duration_seconds,
    )
    db.add(material)
    await db.flush()
    return material


@router.post("/{material_id}/upload")
async def upload_material_file(
    material_id: int,
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Faz upload de arquivo para um material (S3)."""
    import boto3
    import uuid
    from app.core.config import settings

    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    content = await file.read()
    ext = file.filename.split(".")[-1].lower()
    key = f"materials/{material_id}/{uuid.uuid4()}.{ext}"

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
        ContentType=file.content_type or "application/octet-stream",
    )

    cdn_url = f"{settings.AWS_CLOUDFRONT_URL}/{key}" if settings.AWS_CLOUDFRONT_URL else \
              f"https://{settings.AWS_S3_BUCKET}.s3.amazonaws.com/{key}"

    material.file_key = key
    material.file_url = cdn_url
    material.file_size_bytes = len(content)

    return {"file_url": cdn_url, "file_key": key}


@router.put("/{material_id}", dependencies=[Depends(require_admin)], response_model=MaterialResponse)
async def update_material(
    material_id: int,
    data: MaterialCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Atualiza dados de um material."""
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(material, field, value)

    return material


@router.patch("/{material_id}/toggle-publish", dependencies=[Depends(require_admin)])
async def toggle_material_publish(material_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Publica ou despublica um material."""
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    material.is_published = not material.is_published
    state = "publicado" if material.is_published else "despublicado"
    return {"message": f"Material {state} com sucesso", "is_published": material.is_published}


@router.delete("/{material_id}", dependencies=[Depends(require_admin)])
async def delete_material(material_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Remove um material (soft-delete via is_published=False)."""
    result = await db.execute(select(Material).where(Material.id == material_id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    material.is_published = False
    return {"message": f"Material #{material_id} removido"}
