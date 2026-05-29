from sqlalchemy import String, Integer, DateTime, Text, Enum, ForeignKey, Boolean, Float, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"       # aguardando pagamento
    PAID = "paid"             # pago
    FAILED = "failed"         # falhou
    REFUNDED = "refunded"     # estornado
    EXPIRED = "expired"       # expirado


class PaymentMethod(str, enum.Enum):
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    BOLETO = "boleto"
    TRANSFER = "transfer"


class PaymentType(str, enum.Enum):
    SUBSCRIPTION = "subscription"  # mensalidade
    ONE_TIME = "one_time"          # avulso
    REFUND = "refund"              # estorno


class Payment(Base):
    """
    Histórico IMUTÁVEL de pagamentos.
    Registros não podem ser editados após criação — apenas visualizados.
    """
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    # Valores
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # em centavos (sem float)
    currency: Mapped[str] = mapped_column(String(3), default="BRL")

    # Tipo e método
    payment_type: Mapped[PaymentType] = mapped_column(Enum(PaymentType), nullable=False)
    payment_method: Mapped[PaymentMethod | None] = mapped_column(Enum(PaymentMethod))
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING)

    # Referência externa
    gateway: Mapped[str | None] = mapped_column(String(50))   # stripe, pagarme
    gateway_id: Mapped[str | None] = mapped_column(String(255), unique=True)  # ID no gateway
    gateway_response: Mapped[str | None] = mapped_column(Text)  # resposta JSON do gateway

    # Detalhes
    description: Mapped[str | None] = mapped_column(String(500))
    reference_month: Mapped[str | None] = mapped_column(String(7))  # ex: "2025-01"
    due_date: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    paid_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))

    # Assinatura (recorrência)
    subscription_id: Mapped[str | None] = mapped_column(String(255))  # ID da assinatura no Stripe
    invoice_url: Mapped[str | None] = mapped_column(String(500))
    receipt_url: Mapped[str | None] = mapped_column(String(500))

    # Imutabilidade: created_at apenas, SEM updated_at
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relacionamentos
    student = relationship("User", back_populates="payments")

    @property
    def amount_brl(self) -> float:
        """Valor em reais."""
        return self.amount_cents / 100

    def __repr__(self):
        return f"<Payment #{self.id} R${self.amount_brl:.2f} {self.status}>"
