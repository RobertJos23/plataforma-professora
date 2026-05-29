from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.exercise import Exercise, ExerciseSubmission, ExerciseType, DifficultyLevel
from app.models.user import User

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class ExerciseCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exercise_type: ExerciseType
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    level: str = "all"
    content: dict  # JSON flexível por tipo
    use_ai_correction: bool = True
    ai_correction_prompt: Optional[str] = None
    max_score: int = 100
    time_limit_minutes: Optional[int] = None
    points_reward: int = 10


class SubmissionRequest(BaseModel):
    answer: dict  # JSON flexível por tipo de exercício


class ExerciseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    exercise_type: str
    difficulty: str
    level: str
    content: dict
    max_score: int
    time_limit_minutes: Optional[int]
    points_reward: int

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    id: int
    exercise_id: int
    student_id: int
    score: Optional[float]
    is_correct: Optional[bool]
    ai_feedback: Optional[str]
    status: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ─── Rotas do aluno ───────────────────────────────────────

@router.get("/", response_model=list[ExerciseResponse])
async def list_exercises(
    level: Optional[str] = None,
    exercise_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Lista exercícios disponíveis (publicados)."""
    query = select(Exercise).where(Exercise.is_published == True)  # noqa: E712

    if level and level != "all":
        query = query.where((Exercise.level == level) | (Exercise.level == "all"))
    if exercise_type:
        query = query.where(Exercise.exercise_type == exercise_type)
    if difficulty:
        query = query.where(Exercise.difficulty == difficulty)

    query = query.offset(skip).limit(limit).order_by(Exercise.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna um exercício pelo ID."""
    result = await db.execute(
        select(Exercise).where(
            and_(Exercise.id == exercise_id, Exercise.is_published == True)  # noqa: E712
        )
    )
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercício não encontrado")
    return exercise


@router.post("/{exercise_id}/submit", response_model=SubmissionResponse)
async def submit_exercise(
    exercise_id: int,
    data: SubmissionRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Aluno envia resposta para um exercício — correção automática via IA."""
    # Buscar exercício
    result = await db.execute(
        select(Exercise).where(
            and_(Exercise.id == exercise_id, Exercise.is_published == True)  # noqa: E712
        )
    )
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercício não encontrado")

    # Criar submissão
    submission = ExerciseSubmission(
        exercise_id=exercise_id,
        student_id=user_id,
        answer=data.answer,
        status="pending",
    )
    db.add(submission)
    await db.flush()

    # Correção automática (Hard Code) para múltipla escolha e preencher lacuna
    if exercise.exercise_type == ExerciseType.MULTIPLE_CHOICE:
        correct = exercise.content.get("correct_answer", "")
        student_answer = data.answer.get("selected", "")
        submission.is_correct = student_answer == correct
        submission.score = exercise.max_score if submission.is_correct else 0
        submission.ai_feedback = (
            "✅ Correto! Ótimo trabalho!" if submission.is_correct
            else f"❌ Incorreto. A resposta certa era: {correct}"
        )
        submission.status = "corrected"

    elif exercise.exercise_type == ExerciseType.FILL_BLANK:
        correct_answers = [a.lower().strip() for a in exercise.content.get("answers", [])]
        student_answer = data.answer.get("text", "").lower().strip()
        submission.is_correct = student_answer in correct_answers
        submission.score = exercise.max_score if submission.is_correct else 0
        submission.status = "corrected"

    elif exercise.use_ai_correction:
        # Correção via IA para redação, tradução e conversa
        from anthropic import Anthropic
        from app.core.config import settings

        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        correction_prompt = exercise.ai_correction_prompt or \
            f"Correct this {exercise.exercise_type} exercise response for a {exercise.level} level student."

        prompt = f"""{correction_prompt}

Exercise: {exercise.content}
Student's answer: {data.answer}

Respond in JSON:
{{
    "score": <0 to {exercise.max_score}>,
    "is_correct": <true|false>,
    "feedback": "<detailed feedback in Portuguese>",
    "corrected_text": "<corrected version if applicable>"
}}"""

        response = client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        try:
            correction = json.loads(response.content[0].text)
            submission.score = correction.get("score", 0)
            submission.is_correct = correction.get("is_correct", False)
            submission.ai_feedback = correction.get("feedback", "")
            submission.corrected_text = correction.get("corrected_text", "")
        except json.JSONDecodeError:
            submission.ai_feedback = response.content[0].text

        submission.status = "corrected"
        submission.corrected_at = datetime.now(timezone.utc)

    # Atualizar pontos do aluno se correto
    if submission.is_correct and exercise.points_reward > 0:
        user_result = await db.execute(select(User).where(User.id == user_id))
        current_user = user_result.scalar_one_or_none()
        if current_user:
            current_user.total_points += exercise.points_reward

    return submission


@router.get("/my/submissions", response_model=list[SubmissionResponse])
async def get_my_submissions(
    exercise_id: Optional[int] = None,
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna o histórico de submissões do aluno."""
    query = select(ExerciseSubmission).where(ExerciseSubmission.student_id == user_id)
    if exercise_id:
        query = query.where(ExerciseSubmission.exercise_id == exercise_id)

    query = query.order_by(ExerciseSubmission.submitted_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ─── Admin: gerenciar exercícios ──────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ExerciseResponse)
async def create_exercise(
    data: ExerciseCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Cria novo exercício."""
    teacher_id = int(admin["sub"])

    exercise = Exercise(
        teacher_id=teacher_id,
        title=data.title,
        description=data.description,
        exercise_type=data.exercise_type,
        difficulty=data.difficulty,
        level=data.level,
        content=data.content,
        use_ai_correction=data.use_ai_correction,
        ai_correction_prompt=data.ai_correction_prompt,
        max_score=data.max_score,
        time_limit_minutes=data.time_limit_minutes,
        points_reward=data.points_reward,
    )
    db.add(exercise)
    await db.flush()
    return exercise


@router.put("/{exercise_id}", dependencies=[Depends(require_admin)], response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: int,
    data: ExerciseCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Atualiza um exercício."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercício não encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(exercise, field, value)

    return exercise


@router.delete("/{exercise_id}", dependencies=[Depends(require_admin)])
async def delete_exercise(exercise_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Remove (despublica) um exercício."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercício não encontrado")

    exercise.is_published = False
    return {"message": f"Exercício #{exercise_id} removido"}


@router.get("/submissions/pending", dependencies=[Depends(require_admin)])
async def get_pending_submissions(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Lista submissões pendentes de correção manual."""
    result = await db.execute(
        select(ExerciseSubmission)
        .where(ExerciseSubmission.status == "pending")
        .order_by(ExerciseSubmission.submitted_at.asc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/submissions/{submission_id}/grade", dependencies=[Depends(require_admin)])
async def grade_submission_manually(
    submission_id: int,
    score: float,
    feedback: str,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Professora corrige manualmente uma submissão."""
    result = await db.execute(
        select(ExerciseSubmission).where(ExerciseSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submissão não encontrada")

    submission.score = score
    submission.teacher_feedback = feedback
    submission.status = "corrected"
    submission.corrected_at = datetime.now(timezone.utc)

    return {"message": "Submissão corrigida", "score": score}
