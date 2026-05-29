from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.lesson import Lesson, LessonStatus, LessonType
from app.models.user import User

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class LessonCreateRequest(BaseModel):
    student_id: int
    scheduled_at: datetime
    duration_minutes: int = 60
    lesson_type: LessonType = LessonType.INDIVIDUAL
    topic: Optional[str] = None
    description: Optional[str] = None
    meeting_url: Optional[str] = None


class LessonUpdateRequest(BaseModel):
    scheduled_at: Optional[datetime] = None
    topic: Optional[str] = None
    description: Optional[str] = None
    teacher_notes: Optional[str] = None
    homework: Optional[str] = None
    meeting_url: Optional[str] = None
    status: Optional[LessonStatus] = None


class LessonFeedbackRequest(BaseModel):
    rating: float  # 1.0 a 5.0
    feedback: Optional[str] = None


class LessonResponse(BaseModel):
    id: int
    student_id: int
    teacher_id: int
    scheduled_at: datetime
    duration_minutes: int
    lesson_type: str
    status: str
    topic: Optional[str]
    description: Optional[str]
    homework: Optional[str]
    meeting_url: Optional[str]
    ai_summary: Optional[str]
    student_rating: Optional[float]

    model_config = {"from_attributes": True}


# ─── Aluno: suas aulas ────────────────────────────────────

@router.get("/my", response_model=list[LessonResponse])
async def get_my_lessons(
    status_filter: Optional[str] = None,
    upcoming_only: bool = False,
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna as aulas do aluno autenticado."""
    query = select(Lesson).where(Lesson.student_id == user_id)

    if status_filter:
        query = query.where(Lesson.status == status_filter)

    if upcoming_only:
        query = query.where(
            and_(
                Lesson.scheduled_at >= datetime.utcnow(),
                Lesson.status.in_([LessonStatus.SCHEDULED, LessonStatus.CONFIRMED]),
            )
        )

    query = query.order_by(Lesson.scheduled_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/my/next", response_model=Optional[LessonResponse])
async def get_next_lesson(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna a próxima aula agendada do aluno."""
    result = await db.execute(
        select(Lesson)
        .where(
            and_(
                Lesson.student_id == user_id,
                Lesson.scheduled_at >= datetime.utcnow(),
                Lesson.status.in_([LessonStatus.SCHEDULED, LessonStatus.CONFIRMED]),
            )
        )
        .order_by(Lesson.scheduled_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/my/{lesson_id}/confirm")
async def confirm_lesson(
    lesson_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Aluno confirma presença na aula."""
    result = await db.execute(
        select(Lesson).where(
            and_(Lesson.id == lesson_id, Lesson.student_id == user_id)
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")

    lesson.status = LessonStatus.CONFIRMED
    return {"message": "Presença confirmada!"}


@router.post("/my/{lesson_id}/feedback")
async def submit_lesson_feedback(
    lesson_id: int,
    data: LessonFeedbackRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Aluno avalia a aula após conclusão."""
    result = await db.execute(
        select(Lesson).where(
            and_(
                Lesson.id == lesson_id,
                Lesson.student_id == user_id,
                Lesson.status == LessonStatus.COMPLETED,
            )
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada ou ainda não concluída",
        )

    if data.rating < 1 or data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avaliação deve ser entre 1 e 5",
        )

    lesson.student_rating = data.rating
    lesson.student_feedback = data.feedback
    return {"message": "Avaliação enviada. Obrigada! 🌟"}


# ─── Admin: gerenciar aulas ───────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=LessonResponse)
async def create_lesson(
    data: LessonCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Agenda nova aula para um aluno."""
    teacher_id = int(admin["sub"])

    # Verificar se aluno existe
    result = await db.execute(select(User).where(User.id == data.student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado",
        )

    # Verificar limite do plano (Hard Code)
    if student.plan_lessons_limit > 0:
        from sqlalchemy import func, extract
        from datetime import timezone
        now = datetime.now(timezone.utc)
        count_result = await db.execute(
            select(func.count(Lesson.id)).where(
                and_(
                    Lesson.student_id == data.student_id,
                    Lesson.status != LessonStatus.CANCELLED,
                    extract("month", Lesson.scheduled_at) == now.month,
                    extract("year", Lesson.scheduled_at) == now.year,
                )
            )
        )
        lessons_this_month = count_result.scalar()
        if lessons_this_month >= student.plan_lessons_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Limite de {student.plan_lessons_limit} aulas/mês atingido para o plano atual",
            )

    lesson = Lesson(
        student_id=data.student_id,
        teacher_id=teacher_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        lesson_type=data.lesson_type,
        topic=data.topic,
        description=data.description,
        meeting_url=data.meeting_url,
    )
    db.add(lesson)
    await db.flush()
    return lesson


@router.get("/", dependencies=[Depends(require_admin)])
async def list_all_lessons(
    student_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Lista todas as aulas com filtros."""
    query = select(Lesson).offset(skip).limit(limit)

    if student_id:
        query = query.where(Lesson.student_id == student_id)
    if status_filter:
        query = query.where(Lesson.status == status_filter)
    if date_from:
        query = query.where(Lesson.scheduled_at >= date_from)
    if date_to:
        query = query.where(Lesson.scheduled_at <= date_to)

    query = query.order_by(Lesson.scheduled_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna detalhes de uma aula (aluno vê apenas suas aulas)."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")

    # Verificar se o usuário tem acesso
    from sqlalchemy import select as sa_select
    from app.models.user import User
    user_result = await db.execute(sa_select(User).where(User.id == user_id))
    current_user = user_result.scalar_one_or_none()

    if current_user.role != "admin" and lesson.student_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    return lesson


@router.put("/{lesson_id}", dependencies=[Depends(require_admin)], response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    data: LessonUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Atualiza dados de uma aula."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(lesson, field, value)

    if data.status == LessonStatus.COMPLETED:
        lesson.completed_at = datetime.utcnow()

    return lesson


@router.delete("/{lesson_id}", dependencies=[Depends(require_admin)])
async def cancel_lesson(lesson_id: int, db: AsyncSession = Depends(get_db)):
    """[Admin] Cancela uma aula."""
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")

    lesson.status = LessonStatus.CANCELLED
    return {"message": f"Aula #{lesson_id} cancelada"}


@router.post("/{lesson_id}/ai-summary", dependencies=[Depends(require_admin)])
async def generate_ai_summary(
    lesson_id: int,
    transcription: str,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Gera resumo automático da aula com IA."""
    from anthropic import Anthropic
    from app.core.config import settings

    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula não encontrada")

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Analyze this English lesson transcription and provide a summary in Portuguese.

Transcription:
{transcription}

Return a JSON with:
{{
    "summary": "<3-5 sentence summary in Portuguese>",
    "key_points": ["<point 1>", "<point 2>", ...],
    "grammar_topics": ["<topic 1>", ...],
    "vocabulary": ["<word/expression>", ...],
    "homework_suggestion": "<suggested homework>",
    "next_lesson_recommendation": "<what to focus on next>"
}}"""

    response = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    import json
    try:
        summary_data = json.loads(response.content[0].text)
    except json.JSONDecodeError:
        summary_data = {"summary": response.content[0].text}

    lesson.ai_transcription = transcription
    lesson.ai_summary = summary_data.get("summary", "")
    lesson.ai_key_points = json.dumps(summary_data.get("key_points", []))

    return summary_data
