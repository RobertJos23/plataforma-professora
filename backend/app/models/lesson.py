from sqlalchemy import String, Integer, DateTime, Text, Enum, ForeignKey, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class LessonStatus(str, enum.Enum):
    SCHEDULED = "scheduled"    # Agendada
    CONFIRMED = "confirmed"    # Confirmada pelo aluno
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"    # Concluída
    CANCELLED = "cancelled"    # Cancelada
    NO_SHOW = "no_show"        # Aluno não apareceu


class LessonType(str, enum.Enum):
    INDIVIDUAL = "individual"
    GROUP = "group"
    TRIAL = "trial"            # Aula experimental gratuita


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Agendamento
    scheduled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    lesson_type: Mapped[LessonType] = mapped_column(Enum(LessonType), default=LessonType.INDIVIDUAL)
    status: Mapped[LessonStatus] = mapped_column(Enum(LessonStatus), default=LessonStatus.SCHEDULED)

    # Conteúdo
    topic: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    teacher_notes: Mapped[str | None] = mapped_column(Text)  # notas privadas da professora
    homework: Mapped[str | None] = mapped_column(Text)       # lição de casa

    # Reunião online
    meeting_url: Mapped[str | None] = mapped_column(String(500))  # Zoom/Google Meet
    meeting_id: Mapped[str | None] = mapped_column(String(100))
    meeting_password: Mapped[str | None] = mapped_column(String(100))

    # IA — pós aula
    ai_summary: Mapped[str | None] = mapped_column(Text)       # resumo gerado por IA
    ai_key_points: Mapped[str | None] = mapped_column(Text)    # pontos-chave (JSON)
    ai_transcription: Mapped[str | None] = mapped_column(Text) # transcrição da aula

    # Feedback
    student_rating: Mapped[float | None] = mapped_column(Float)
    student_feedback: Mapped[str | None] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Relacionamentos
    student = relationship("User", back_populates="lessons", foreign_keys=[student_id])
    teacher = relationship("User", foreign_keys=[teacher_id])

    def __repr__(self):
        return f"<Lesson #{self.id} - {self.status} @ {self.scheduled_at}>"
