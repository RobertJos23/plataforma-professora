from sqlalchemy import String, Integer, DateTime, Text, Enum, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ExerciseType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"  # múltipla escolha
    FILL_BLANK = "fill_blank"            # preencher lacuna
    ESSAY = "essay"                      # redação
    AUDIO = "audio"                      # pronúncia/áudio
    TRANSLATION = "translation"          # tradução
    CONVERSATION = "conversation"        # simulação de conversa


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Info
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    exercise_type: Mapped[ExerciseType] = mapped_column(Enum(ExerciseType), nullable=False)
    difficulty: Mapped[DifficultyLevel] = mapped_column(Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    level: Mapped[str] = mapped_column(String(10), default="all")  # A1-C2 ou all

    # Conteúdo (JSON flexível por tipo)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Para multiple_choice: {"question": "...", "options": [...], "correct": "..."}
    # Para essay: {"prompt": "...", "min_words": 100, "max_words": 300}
    # Para fill_blank: {"text": "The ___ is blue", "answers": ["sky"]}
    # Para audio: {"text": "...", "target_words": [...]}

    # Correção
    use_ai_correction: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_correction_prompt: Mapped[str | None] = mapped_column(Text)  # instruções para a IA
    max_score: Mapped[int] = mapped_column(Integer, default=100)

    # Controle
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer)

    # Gamificação
    points_reward: Mapped[int] = mapped_column(Integer, default=10)

    # Timestamps
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos
    teacher = relationship("User", foreign_keys=[teacher_id])
    submissions = relationship("ExerciseSubmission", back_populates="exercise")


class ExerciseSubmission(Base):
    """Submissão de um aluno para um exercício."""
    __tablename__ = "exercise_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    exercise_id: Mapped[int] = mapped_column(Integer, ForeignKey("exercises.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Resposta
    answer: Mapped[dict] = mapped_column(JSON)  # formato flexível por tipo
    audio_file_key: Mapped[str | None] = mapped_column(String(500))  # para exercícios de áudio

    # Correção
    score: Mapped[float | None] = mapped_column(Float)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    ai_feedback: Mapped[str | None] = mapped_column(Text)   # feedback detalhado da IA
    teacher_feedback: Mapped[str | None] = mapped_column(Text)
    corrected_text: Mapped[str | None] = mapped_column(Text)  # versão corrigida (redação)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, corrected
    attempts: Mapped[int] = mapped_column(Integer, default=1)

    # Timestamps
    submitted_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    corrected_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    exercise = relationship("Exercise", back_populates="submissions")
    student = relationship("User", back_populates="exercise_submissions")
