from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import User
from app.models.lesson import Lesson, LessonStatus
from app.models.payment import Payment, PaymentStatus
from app.models.exercise import ExerciseSubmission
from app.models.progress import Progress, Notification

router = APIRouter()


# ─── Dashboard Principal ──────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Dados do dashboard principal da professora.
    Retorna: alunos ativos, aulas da semana, receita mensal e pendências.
    """
    now = datetime.now(timezone.utc)

    # ── Alunos ──────────────────────────────────────────────
    active_students_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == "student", User.is_active == True  # noqa: E712
        )
    )
    active_students = active_students_result.scalar() or 0

    new_students_this_month_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == "student",
            extract("month", User.created_at) == now.month,
            extract("year", User.created_at) == now.year,
        )
    )
    new_students = new_students_this_month_result.scalar() or 0

    blocked_students_result = await db.execute(
        select(func.count(User.id)).where(User.is_blocked == True)  # noqa: E712
    )
    blocked_students = blocked_students_result.scalar() or 0

    # ── Aulas (semana atual) ──────────────────────────────────
    from datetime import timedelta
    week_start = now - timedelta(days=now.weekday())
    week_end = week_start + timedelta(days=7)

    lessons_this_week_result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.scheduled_at >= week_start,
            Lesson.scheduled_at < week_end,
            Lesson.status != LessonStatus.CANCELLED,
        )
    )
    lessons_this_week = lessons_this_week_result.scalar() or 0

    lessons_completed_today_result = await db.execute(
        select(func.count(Lesson.id)).where(
            func.date(Lesson.scheduled_at) == now.date(),
            Lesson.status == LessonStatus.COMPLETED,
        )
    )
    lessons_today = lessons_completed_today_result.scalar() or 0

    # Próximas aulas (hoje + amanhã)
    next_lessons_result = await db.execute(
        select(Lesson)
        .where(
            Lesson.scheduled_at >= now,
            Lesson.status.in_([LessonStatus.SCHEDULED, LessonStatus.CONFIRMED]),
        )
        .order_by(Lesson.scheduled_at.asc())
        .limit(5)
    )
    next_lessons = next_lessons_result.scalars().all()

    # ── Financeiro (mês atual) ───────────────────────────────
    reference_month = f"{now.year:04d}-{now.month:02d}"

    received_result = await db.execute(
        select(func.sum(Payment.amount_cents)).where(
            Payment.reference_month == reference_month,
            Payment.status == PaymentStatus.PAID,
        )
    )
    received_cents = received_result.scalar() or 0

    pending_result = await db.execute(
        select(func.sum(Payment.amount_cents)).where(
            Payment.reference_month == reference_month,
            Payment.status == PaymentStatus.PENDING,
        )
    )
    pending_cents = pending_result.scalar() or 0

    # ── Exercícios pendentes de correção ─────────────────────
    pending_corrections_result = await db.execute(
        select(func.count(ExerciseSubmission.id)).where(
            ExerciseSubmission.status == "pending"
        )
    )
    pending_corrections = pending_corrections_result.scalar() or 0

    return {
        "students": {
            "active": active_students,
            "new_this_month": new_students,
            "blocked": blocked_students,
        },
        "lessons": {
            "this_week": lessons_this_week,
            "today_completed": lessons_today,
            "next": [
                {
                    "id": l.id,
                    "student_id": l.student_id,
                    "scheduled_at": l.scheduled_at.isoformat(),
                    "topic": l.topic,
                    "status": l.status,
                    "meeting_url": l.meeting_url,
                }
                for l in next_lessons
            ],
        },
        "financial": {
            "reference_month": reference_month,
            "received_brl": received_cents / 100,
            "pending_brl": pending_cents / 100,
        },
        "pending_corrections": pending_corrections,
    }


# ─── Alunos inadimplentes ────────────────────────────────

@router.get("/delinquent-students", dependencies=[Depends(require_admin)])
async def get_delinquent_students(db: AsyncSession = Depends(get_db)):
    """[Admin] Lista alunos com pagamentos pendentes há mais de 30 dias."""
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    result = await db.execute(
        select(User)
        .join(Payment, Payment.student_id == User.id)
        .where(
            Payment.status == PaymentStatus.PENDING,
            Payment.created_at <= cutoff,
            User.is_active == True,  # noqa: E712
        )
        .distinct()
    )
    return result.scalars().all()


@router.post("/auto-block-delinquent", dependencies=[Depends(require_admin)])
async def auto_block_delinquent(db: AsyncSession = Depends(get_db)):
    """
    [Admin] Hard Code: bloqueia automaticamente alunos com
    pagamento vencido há mais de 30 dias.
    """
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    result = await db.execute(
        select(User)
        .join(Payment, Payment.student_id == User.id)
        .where(
            Payment.status == PaymentStatus.PENDING,
            Payment.due_date <= cutoff,
            User.is_blocked == False,  # noqa: E712
            User.is_active == True,    # noqa: E712
        )
        .distinct()
    )
    students = result.scalars().all()

    blocked_count = 0
    for student in students:
        student.is_blocked = True
        student.blocked_reason = "Pagamento vencido há mais de 30 dias"

        # Notificar aluno
        notification = Notification(
            user_id=student.id,
            title="⚠️ Acesso bloqueado",
            message="Seu acesso foi bloqueado por pagamento pendente. Entre em contato com a professora.",
            notification_type="payment_due",
        )
        db.add(notification)
        blocked_count += 1

    return {"blocked_count": blocked_count, "message": f"{blocked_count} aluno(s) bloqueado(s)"}


# ─── Estatísticas gerais ─────────────────────────────────

@router.get("/stats/overview", dependencies=[Depends(require_admin)])
async def get_stats_overview(db: AsyncSession = Depends(get_db)):
    """[Admin] Visão geral de estatísticas da plataforma."""
    now = datetime.now(timezone.utc)

    # Totais
    total_students = (await db.execute(
        select(func.count(User.id)).where(User.role == "student")
    )).scalar() or 0

    total_lessons = (await db.execute(select(func.count(Lesson.id)))).scalar() or 0

    completed_lessons = (await db.execute(
        select(func.count(Lesson.id)).where(Lesson.status == LessonStatus.COMPLETED)
    )).scalar() or 0

    total_revenue = (await db.execute(
        select(func.sum(Payment.amount_cents)).where(Payment.status == PaymentStatus.PAID)
    )).scalar() or 0

    total_exercises = (await db.execute(select(func.count(ExerciseSubmission.id)))).scalar() or 0

    # Médias
    avg_rating_result = await db.execute(
        select(func.avg(Lesson.student_rating)).where(Lesson.student_rating.isnot(None))
    )
    avg_rating = round(float(avg_rating_result.scalar() or 0), 2)

    return {
        "students": {
            "total": total_students,
        },
        "lessons": {
            "total": total_lessons,
            "completed": completed_lessons,
            "completion_rate": round((completed_lessons / total_lessons * 100) if total_lessons else 0, 1),
            "average_rating": avg_rating,
        },
        "financial": {
            "total_revenue_brl": total_revenue / 100,
        },
        "exercises": {
            "total_submissions": total_exercises,
        },
    }


# ─── Comunicados em massa ────────────────────────────────

@router.post("/broadcast", dependencies=[Depends(require_admin)])
async def broadcast_message(
    title: str,
    message: str,
    plan_filter: str = None,  # None = todos
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Envia comunicado para todos os alunos (ou por plano)."""
    query = select(User.id).where(User.is_active == True, User.role == "student")  # noqa: E712
    if plan_filter:
        query = query.where(User.plan == plan_filter)

    result = await db.execute(query)
    user_ids = [row[0] for row in result.all()]

    notifications = [
        Notification(
            user_id=uid,
            title=title,
            message=message,
            notification_type="announcement",
        )
        for uid in user_ids
    ]
    db.add_all(notifications)

    return {
        "sent_to": len(notifications),
        "message": f"Comunicado enviado para {len(notifications)} aluno(s)",
    }


# ─── Relatório de frequência ─────────────────────────────

@router.get("/reports/attendance", dependencies=[Depends(require_admin)])
async def attendance_report(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Relatório de frequência por aluno no mês."""
    now = datetime.now(timezone.utc)
    month = month or now.month
    year = year or now.year

    result = await db.execute(
        select(
            User.id,
            User.full_name,
            User.email,
            func.count(Lesson.id).label("scheduled"),
            func.sum(
                (Lesson.status == LessonStatus.COMPLETED.value).cast(
                    __import__("sqlalchemy").Integer
                )
            ).label("completed"),
        )
        .join(Lesson, Lesson.student_id == User.id, isouter=True)
        .where(
            User.role == "student",
            User.is_active == True,  # noqa: E712
            (Lesson.id.is_(None)) |
            (
                extract("month", Lesson.scheduled_at) == month,
                extract("year", Lesson.scheduled_at) == year,
            ),
        )
        .group_by(User.id, User.full_name, User.email)
        .order_by(User.full_name.asc())
    )

    rows = result.all()
    report = []
    for row in rows:
        scheduled = row.scheduled or 0
        completed = row.completed or 0
        rate = round((completed / scheduled * 100) if scheduled > 0 else 0, 1)
        report.append({
            "student_id": row.id,
            "name": row.full_name,
            "email": row.email,
            "scheduled": scheduled,
            "completed": completed,
            "attendance_rate": rate,
        })

    return {"month": month, "year": year, "students": report}
