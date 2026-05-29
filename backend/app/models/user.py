from sqlalchemy import String, Boolean, Enum, Integer, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"


class LanguageLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)

    # Perfil do aluno
    level: Mapped[LanguageLevel | None] = mapped_column(Enum(LanguageLevel))
    objective: Mapped[str | None] = mapped_column(Text)                   # Ex: "Viagem", "Negócios"
    preferred_schedule: Mapped[str | None] = mapped_column(String(100))   # Ex: "manhã", "noite"
    timezone: Mapped[str] = mapped_column(String(50), default="America/Sao_Paulo")

    # Financeiro
    plan: Mapped[str | None] = mapped_column(String(50))           # basic, standard, premium
    plan_lessons_limit: Mapped[int] = mapped_column(Integer, default=4)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)  # inadimplência
    blocked_reason: Mapped[str | None] = mapped_column(String(255))

    # Gamificação
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Relacionamentos
    lessons = relationship("Lesson", back_populates="student", foreign_keys="Lesson.student_id")
    materials_access = relationship("MaterialAccess", back_populates="user")
    exercise_submissions = relationship("ExerciseSubmission", back_populates="student")
    payments = relationship("Payment", back_populates="student")
    progress = relationship("Progress", back_populates="student")
    badges = relationship("Badge", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
