from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user_id, require_admin
from app.models.payment import Payment, PaymentStatus, PaymentMethod, PaymentType
from app.models.user import User

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────

class PaymentCreateRequest(BaseModel):
    student_id: int
    amount_cents: int
    payment_type: PaymentType
    payment_method: Optional[PaymentMethod] = None
    description: Optional[str] = None
    reference_month: Optional[str] = None  # "2025-01"
    due_date: Optional[datetime] = None


class PaymentResponse(BaseModel):
    id: int
    student_id: int
    amount_cents: int
    amount_brl: float
    currency: str
    payment_type: str
    payment_method: Optional[str]
    status: str
    description: Optional[str]
    reference_month: Optional[str]
    due_date: Optional[datetime]
    paid_at: Optional[datetime]
    invoice_url: Optional[str]
    receipt_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Aluno: ver seus pagamentos ───────────────────────────

@router.get("/my", response_model=list[PaymentResponse])
async def get_my_payments(
    status_filter: Optional[str] = None,
    limit: int = 24,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna histórico de pagamentos do aluno autenticado."""
    query = select(Payment).where(Payment.student_id == user_id)

    if status_filter:
        query = query.where(Payment.status == status_filter)

    query = query.order_by(Payment.created_at.desc()).limit(limit)
    result = await db.execute(query)
    payments = result.scalars().all()

    # Enriquecer com amount_brl
    return [
        {
            **{k: getattr(p, k) for k in PaymentResponse.model_fields if hasattr(p, k)},
            "amount_brl": p.amount_brl,
        }
        for p in payments
    ]


@router.get("/my/pending-amount")
async def get_my_pending_amount(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retorna o total pendente de pagamento do aluno."""
    result = await db.execute(
        select(func.sum(Payment.amount_cents))
        .where(
            Payment.student_id == user_id,
            Payment.status == PaymentStatus.PENDING,
        )
    )
    total_cents = result.scalar() or 0
    return {
        "pending_cents": total_cents,
        "pending_brl": total_cents / 100,
    }


# ─── Admin: gerenciar pagamentos ──────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PaymentResponse)
async def create_payment(
    data: PaymentCreateRequest,
    admin: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Registra pagamento manual (PIX, transferência).
    Histórico IMUTÁVEL — sem updated_at.
    """
    # Verificar aluno
    result = await db.execute(select(User).where(User.id == data.student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    payment = Payment(
        student_id=data.student_id,
        amount_cents=data.amount_cents,
        payment_type=data.payment_type,
        payment_method=data.payment_method,
        description=data.description,
        reference_month=data.reference_month,
        due_date=data.due_date,
    )
    db.add(payment)
    await db.flush()

    return {
        **{k: getattr(payment, k) for k in PaymentResponse.model_fields if hasattr(payment, k)},
        "amount_brl": payment.amount_brl,
    }


@router.post("/{payment_id}/mark-paid", dependencies=[Depends(require_admin)])
async def mark_as_paid(
    payment_id: int,
    payment_method: Optional[PaymentMethod] = None,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Marca pagamento como pago e desbloqueia aluno se bloqueado."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")

    if payment.status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pagamento já marcado como pago",
        )

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.now(timezone.utc)
    if payment_method:
        payment.payment_method = payment_method

    # Desbloquear aluno automaticamente (Hard Code)
    student_result = await db.execute(select(User).where(User.id == payment.student_id))
    student = student_result.scalar_one_or_none()
    if student and student.is_blocked:
        # Verificar se ainda há pendências
        pending_result = await db.execute(
            select(func.count(Payment.id))
            .where(
                Payment.student_id == payment.student_id,
                Payment.status == PaymentStatus.PENDING,
                Payment.id != payment_id,
            )
        )
        still_pending = pending_result.scalar()
        if not still_pending:
            student.is_blocked = False
            student.blocked_reason = None

    return {"message": f"Pagamento #{payment_id} marcado como pago. Aluno desbloqueado." if not student.is_blocked
            else f"Pagamento #{payment_id} marcado como pago."}


@router.get("/", dependencies=[Depends(require_admin)])
async def list_payments(
    student_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    reference_month: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Lista todos os pagamentos com filtros."""
    query = select(Payment).offset(skip).limit(limit)

    if student_id:
        query = query.where(Payment.student_id == student_id)
    if status_filter:
        query = query.where(Payment.status == status_filter)
    if reference_month:
        query = query.where(Payment.reference_month == reference_month)

    query = query.order_by(Payment.created_at.desc())
    result = await db.execute(query)
    payments = result.scalars().all()

    return [
        {
            **{k: getattr(p, k) for k in PaymentResponse.model_fields if hasattr(p, k)},
            "amount_brl": p.amount_brl,
        }
        for p in payments
    ]


@router.get("/report/monthly", dependencies=[Depends(require_admin)])
async def monthly_report(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
):
    """[Admin] Relatório financeiro mensal."""
    from sqlalchemy import extract

    reference = f"{year:04d}-{month:02d}"

    result = await db.execute(
        select(
            func.sum(Payment.amount_cents).label("total"),
            func.count(Payment.id).label("count"),
            Payment.status,
        )
        .where(Payment.reference_month == reference)
        .group_by(Payment.status)
    )
    rows = result.all()

    totals = {row.status: {"total_cents": row.total or 0, "count": row.count} for row in rows}

    paid = totals.get(PaymentStatus.PAID.value, {"total_cents": 0, "count": 0})
    pending = totals.get(PaymentStatus.PENDING.value, {"total_cents": 0, "count": 0})

    return {
        "reference_month": reference,
        "paid_brl": paid["total_cents"] / 100,
        "paid_count": paid["count"],
        "pending_brl": pending["total_cents"] / 100,
        "pending_count": pending["count"],
        "total_brl": (paid["total_cents"] + pending["total_cents"]) / 100,
    }


# ─── Webhook Stripe ───────────────────────────────────────

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook do Stripe para pagamentos automáticos."""
    import stripe
    from app.core.config import settings

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Processar evento
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]

        # Atualizar pagamento pelo gateway_id
        result = await db.execute(
            select(Payment).where(Payment.gateway_id == payment_intent["id"])
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.PAID
            payment.paid_at = datetime.now(timezone.utc)
            payment.gateway_response = str(payment_intent)

    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]

        result = await db.execute(
            select(Payment).where(Payment.gateway_id == payment_intent["id"])
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = str(payment_intent)

    return {"status": "ok"}
