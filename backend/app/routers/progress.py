from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.progress import Progress, Badge, Notification
from app.models.lesson import Lesson, LessonStatus
from app.models.exercise import ExerciseSubmission
from app.models.user import User

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class ProgressResponse(BaseModel):
    student_id: int
    current_level: str
    placement_score: Optional[float]
    total_lessons_completed: int
    total_lessons_scheduled: int
    attendance_percentage: float
    total_hours_completed: float
    total_exercises_done: int
    average_exercise_score: float
    total_points: int
    current_streak: int
    longest_streak: int
    ai_recommendation: Optional[str]
    skills_scores: Optional[dict]

    model_config = {"from_attributes": True}


class PlacementTestRequest(BaseModel):
    answers: list[dict]  # [{"question_id": 1, "selected": "B"}, ...]


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    action_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Progresso do aluno ───────────────────────────────────

@router.get("/me", response_model=ProgressResponse)
async def get_my_progress(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna o progresso consolidado do aluno."""
    result = await db.execute(
        select(Progress).where(Progress.student_id == user_id)
    )
    progress = result.scalar_one_or_none()

    if not progress:
        # Criar progresso inicial
        progress = Progress(student_id=user_id)
        db.add(progress)
        await db.flush()

    # Recalcular frequência (Hard Code)
    await _recalculate_attendance(user_id, progress, db)
    return progress


@router.post("/me/placement-test")
async def submit_placement_test(
    data: PlacementTestRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Aluno realiza teste de nivelamento.
    Hard Code: cálculo de pontuação → nível automático.
    """
    # Hard Code: questões corretas por nível
    PLACEMENT_QUESTIONS = {
        1: {"correct": "B", "level": "A1", "points": 1},
        2: {"correct": "A", "level": "A1", "points": 1},
        3: {"correct": "C", "level": "A2", "points": 2},
        4: {"correct": "D", "level": "A2", "points": 2},
        5: {"correct": "B", "level": "B1", "points": 3},
        6: {"correct": "A", "level": "B1", "points": 3},
        7: {"correct": "C", "level": "B2", "points": 4},
        8: {"correct": "D", "level": "B2", "points": 4},
        9: {"correct": "A", "level": "C1", "points": 5},
        10: {"correct": "B", "level": "C1", "points": 5},
    }

    total_points = 0
    max_points = sum(q["points"] for q in PLACEMENT_QUESTIONS.values())

    for answer in data.answers:
        q_id = answer.get("question_id")
        q_data = PLACEMENT_QUESTIONS.get(q_id)
        if q_data and answer.get("selected") == q_data["correct"]:
            total_points += q_data["points"]

    score_percentage = (total_points / max_points) * 100

    # Mapear pontuação para nível CEFR (Hard Code)
    if score_percentage >= 85:
        level = "C1"
    elif score_percentage >= 70:
        level = "B2"
    elif score_percentage >= 55:
        level = "B1"
    elif score_percentage >= 40:
        level = "A2"
    else:
        level = "A1"

    # Atualizar progresso e perfil
    progress_result = await db.execute(select(Progress).where(Progress.student_id == user_id))
    progress = progress_result.scalar_one_or_none()
    if not progress:
        progress = Progress(student_id=user_id)
        db.add(progress)
        await db.flush()

    progress.current_level = level
    progress.placement_score = score_percentage
    progress.placement_taken_at = datetime.now(timezone.utc)

    # Atualizar nível no perfil
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.level = level

    # Badge de nivelamento
    await _award_badge(
        user_id=user_id,
        badge_key="placement_done",
        title="Nivelamento Completo 🎯",
        description="Realizou o teste de nivelamento",
        points=50,
        db=db,
    )

    return {
        "level": level,
        "score_percentage": round(score_percentage, 1),
        "message": f"Parabéns! Seu nível é {level} 🎉",
    }


# ─── Gamificação ──────────────────────────────────────────

@router.get("/me/badges")
async def get_my_badges(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna as conquistas (badges) do aluno."""
    result = await db.execute(
        select(Badge)
        .where(Badge.user_id == user_id)
        .order_by(Badge.earned_at.desc())
    )
    return result.scalars().all()


@router.get("/me/ranking")
async def get_ranking(
    limit: int = 10,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Ranking dos alunos por pontos."""
    result = await db.execute(
        select(User.id, User.full_name, User.avatar_url, User.total_points)
        .where(User.is_active == True, User.role == "student")  # noqa: E712
        .order_by(User.total_points.desc())
        .limit(limit)
    )
    ranking = result.all()

    # Posição do aluno atual
    position = next(
        (i + 1 for i, r in enumerate(ranking) if r.id == user_id), None
    )

    return {
        "ranking": [
            {"position": i + 1, "id": r.id, "name": r.full_name,
             "avatar_url": r.avatar_url, "points": r.total_points}
            for i, r in enumerate(ranking)
        ],
        "my_position": position,
    }


# ─── Notificações ─────────────────────────────────────────

@router.get("/me/notifications", response_model=list[NotificationResponse])
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna notificações do aluno."""
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712

    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/me/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Marca notificação como lida."""
    result = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")

    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    return {"message": "Notificação lida"}


@router.post("/me/notifications/read-all")
async def mark_all_notifications_read(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Marca todas as notificações como lidas."""
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(Notification)
        .where(and_(Notification.user_id == user_id, Notification.is_read == False))  # noqa: E712
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    return {"message": "Todas notificações marcadas como lidas"}


# ─── Admin: enviar notificação ────────────────────────────

@router.post("/notifications/send", dependencies=[Depends(require_admin)])
async def send_notification(
    student_id: Optional[int] = None,  # None = todos os alunos
    title: str = "",
    message: str = "",
    notification_type: str = "announcement",
    action_url: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Envia notificação para um aluno ou para todos."""
    if student_id:
        user_ids = [student_id]
    else:
        result = await db.execute(
            select(User.id).where(User.is_active == True, User.role == "student")  # noqa: E712
        )
        user_ids = [row[0] for row in result.all()]

    notifications = [
        Notification(
            user_id=uid,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
        )
        for uid in user_ids
    ]
    db.add_all(notifications)

    return {"message": f"{len(notifications)} notificação(ões) enviada(s)"}


# ─── Admin: ver progresso de aluno ────────────────────────

@router.get("/{student_id}", dependencies=[Depends(require_admin)], response_model=ProgressResponse)
async def get_student_progress(
    student_id: int,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Retorna progresso de um aluno específico."""
    result = await db.execute(select(Progress).where(Progress.student_id == student_id))
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progresso não encontrado para este aluno",
        )
    return progress


# ─── Helpers internos ─────────────────────────────────────

async def _recalculate_attendance(user_id: int, progress: Progress, db: AsyncSession):
    """Hard Code: recalcula % de presença com base nas aulas."""
    result = await db.execute(
        select(
            func.count(Lesson.id).label("total"),
            func.sum(
                (Lesson.status == LessonStatus.COMPLETED.value).cast(db.bind.dialect.name == "postgresql"
                    and __import__("sqlalchemy").Integer or __import__("sqlalchemy").Integer)
            ).label("completed"),
        )
        .where(Lesson.student_id == user_id)
    )
    # Forma simplificada — evita complexidade de cast cross-DB
    total_result = await db.execute(
        select(func.count(Lesson.id)).where(Lesson.student_id == user_id)
    )
    completed_result = await db.execute(
        select(func.count(Lesson.id)).where(
            and_(Lesson.student_id == user_id, Lesson.status == LessonStatus.COMPLETED)
        )
    )
    cancelled_result = await db.execute(
        select(func.count(Lesson.id)).where(
            and_(Lesson.student_id == user_id, Lesson.status == LessonStatus.CANCELLED)
        )
    )

    total = total_result.scalar() or 0
    completed = completed_result.scalar() or 0
    cancelled = cancelled_result.scalar() or 0

    scheduled = total - cancelled
    progress.total_lessons_scheduled = scheduled
    progress.total_lessons_completed = completed
    if scheduled > 0:
        progress.attendance_percentage = round((completed / scheduled) * 100, 1)

    # Horas totais (Hard Code: duração padrão 60min)
    hours_result = await db.execute(
        select(func.sum(Lesson.duration_minutes)).where(
            and_(Lesson.student_id == user_id, Lesson.status == LessonStatus.COMPLETED)
        )
    )
    total_minutes = hours_result.scalar() or 0
    progress.total_hours_completed = round(total_minutes / 60, 1)


async def _award_badge(
    user_id: int,
    badge_key: str,
    title: str,
    description: str,
    points: int,
    db: AsyncSession,
):
    """Concede badge ao aluno (se ainda não tiver)."""
    existing = await db.execute(
        select(Badge).where(
            and_(Badge.user_id == user_id, Badge.badge_key == badge_key)
        )
    )
    if existing.scalar_one_or_none():
        return  # já tem este badge

    badge = Badge(
        user_id=user_id,
        badge_key=badge_key,
        title=title,
        description=description,
        points_awarded=points,
    )
    db.add(badge)

    # Atualizar pontos do usuário
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.total_points += points

    # Notificação
    notification = Notification(
        user_id=user_id,
        title=f"🏆 Nova conquista: {title}",
        message=description,
        notification_type="badge_earned",
    )
    db.add(notification)
