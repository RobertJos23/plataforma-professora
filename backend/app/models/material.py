from sqlalchemy import String, Integer, DateTime, Text, Enum, ForeignKey, Boolean, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class MaterialType(str, enum.Enum):
    PDF = "pdf"
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    LINK = "link"
    EBOOK = "ebook"


class LanguageLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"
    ALL = "all"  # para todos os níveis


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Info
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    material_type: Mapped[MaterialType] = mapped_column(Enum(MaterialType), nullable=False)
    level: Mapped[LanguageLevel] = mapped_column(Enum(LanguageLevel), default=LanguageLevel.ALL)
    tags: Mapped[str | None] = mapped_column(String(500))  # JSON array de tags

    # Arquivo
    file_key: Mapped[str | None] = mapped_column(String(500))    # chave no S3
    file_url: Mapped[str | None] = mapped_column(String(500))    # URL pública/assinada
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    external_url: Mapped[str | None] = mapped_column(String(500))  # para type=LINK

    # Controle de acesso
    is_free: Mapped[bool] = mapped_column(Boolean, default=False)   # isca digital
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))  # expiração de gratuitos
    required_plan: Mapped[str | None] = mapped_column(String(50))   # plano mínimo para acessar

    # Metadados
    duration_seconds: Mapped[int | None] = mapped_column(Integer)  # para vídeos/áudios
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    teacher = relationship("User", foreign_keys=[teacher_id])
    access_records = relationship("MaterialAccess", back_populates="material")


class MaterialAccess(Base):
    """Registro de acesso de aluno a material."""
    __tablename__ = "material_accesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    material_id: Mapped[int] = mapped_column(Integer, ForeignKey("materials.id"), nullable=False)
    accessed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="materials_access")
    material = relationship("Material", back_populates="access_records")
