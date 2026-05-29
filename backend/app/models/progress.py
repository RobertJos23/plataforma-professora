from sqlalchemy import String, Integer, DateTime, Text, Enum, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Progress(Base):
    """Progresso consolidado do aluno."""
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Nível atual (calculado automaticamente)
    current_level: Mapped[str] = mapped_column(String(5), default="A1")
    placement_score: Mapped[float | None] = mapped_column(Float)  # nota do teste de nivelamento
    placement_taken_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Frequência
    total_lessons_scheduled: Mapped[int] = mapped_column(Integer, default=0)
    total_lessons_completed: Mapped[int] = mapped_column(Integer, default=0)
    total_lessons_cancelled: Mapped[int] = mapped_column(Integer, default=0)
    attendance_percentage: Mapped[float] = mapped_column(Float, default=0.0)  # % de presença

    # Horas
    total_hours_completed: Mapped[float] = mapped_column(Float, default=0.0)
    current_month_hours: Mapped[float] = mapped_column(Float, default=0.0)

    # Exercícios
    total_exercises_done: Mapped[int] = mapped_column(Integer, default=0)
    total_exercises_correct: Mapped[int] = mapped_column(Integer, default=0)
    average_exercise_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Gamificação
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)  # dias seguidos
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # IA — recomendações
    ai_recommendation: Mapped[str | None] = mapped_column(Text)  # próximos passos recomendados
    ai_recommendation_updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Skills breakdown (JSON: {grammar: 75, vocabulary: 80, ...})
    skills_scores: Mapped[dict | None] = mapped_column(JSON)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relacionamentos
    student = relationship("User", back_populates="progress")


class Badge(Base):
    """Conquistas / badges do aluno (gamificação)."""
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    badge_key: Mapped[str] = mapped_column(String(100), nullable=False)
    # Ex: "first_lesson", "streak_7", "level_b1", "perfect_exercise", "100_hours"

    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon_url: Mapped[str | None] = mapped_column(String(500))
    points_awarded: Mapped[int] = mapped_column(Integer, default=0)

    earned_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="badges")


class Notification(Base):
    """Notificações do usuário."""
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(50))
    # Ex: "lesson_reminder", "new_material", "payment_due", "badge_earned"

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500))  # link de ação

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    read_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    user = relationship("User", back_populates="notifications")
