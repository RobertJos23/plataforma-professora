"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, Award, DollarSign, Lock, Unlock } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface StudentDetail {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  plan?: string;
  current_level?: string;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason?: string;
  created_at: string;
  total_lessons_completed?: number;
  total_points?: number;
  attendance_percentage?: number;
  lessons?: Array<{ id: number; scheduled_at: string; status: string; topic?: string }>;
  payments?: Array<{ id: number; amount: number; status: string; created_at: string; description?: string }>;
}

const planColors: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-600",
  premium: "bg-purple-100 text-purple-600",
};

export default function AlunoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const id = Number(params.id);

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    adminApi.getStudent(id).then((r) => setStudent(r.data)).finally(() => setIsLoading(false));
  }, [isAuthenticated, user, id]);

  const handleUnblock = async () => {
    if (!student) return;
    setBlocking(true);
    try {
      await adminApi.unblockStudent(student.id);
      setStudent((s) => s ? { ...s, is_blocked: false, blocked_reason: undefined } : s);
    } finally {
      setBlocking(false);
    }
  };

  const handleBlock = async () => {
    if (!student) return;
    setBlocking(true);
    try {
      await adminApi.blockStudent(student.id, blockReason);
      setStudent((s) => s ? { ...s, is_blocked: true, blocked_reason: blockReason } : s);
      setBlockModal(false);
    } finally {
      setBlocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <main className="mx-auto max-w-4xl px-4 pt-20 pb-12 text-center">
          <p className="text-gray-500 mt-8">Aluno não encontrado.</p>
          <Link href="/admin/alunos" className="btn-secondary mt-4">Voltar</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/admin/alunos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para alunos
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-600">
                {student.full_name.charAt(0)}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">{student.full_name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`badge capitalize ${planColors[student.plan || "basic"]}`}>{student.plan || "basic"}</span>
                  {student.current_level && <span className="badge bg-blue-100 text-blue-600">{student.current_level}</span>}
                  {student.is_blocked
                    ? <span className="badge bg-red-100 text-red-600">Bloqueado</span>
                    : <span className="badge bg-green-100 text-green-600">Ativo</span>}
                </div>
              </div>
            </div>
            <div>
              {student.is_blocked ? (
                <button onClick={handleUnblock} disabled={blocking} className="btn-secondary py-2 text-sm">
                  <Unlock className="h-4 w-4" />
                  {blocking ? "..." : "Desbloquear"}
                </button>
              ) : (
                <button onClick={() => setBlockModal(true)} className="rounded-xl border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <Lock className="inline h-4 w-4 mr-1.5" />
                  Bloquear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Info */}
          <div className="space-y-4 lg:col-span-1">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Informações</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700 break-all">{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700">{student.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-700">
                    Desde {new Date(student.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              {student.is_blocked && student.blocked_reason && (
                <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold text-red-700">Motivo do bloqueio:</p>
                  <p className="text-xs text-red-600 mt-0.5">{student.blocked_reason}</p>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Progresso
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Aulas concluídas", value: student.total_lessons_completed || 0 },
                  { label: "Pontos totais", value: `⭐ ${student.total_points || 0}` },
                  { label: "Frequência", value: `${student.attendance_percentage || 0}%` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            {/* Aulas */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                Últimas aulas
              </h2>
              {(student.lessons || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nenhuma aula registrada</p>
              ) : (
                <div className="space-y-2">
                  {(student.lessons || []).slice(0, 5).map((l) => (
                    <div key={l.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{l.topic || "Aula"}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(l.scheduled_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <span className={`badge text-xs ${
                        l.status === "completed" ? "bg-green-100 text-green-700" :
                        l.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                        l.status === "cancelled" ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagamentos */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Histórico de pagamentos
              </h2>
              {(student.payments || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-2">
                  {(student.payments || []).slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.description || "Mensalidade"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">R$ {p.amount.toFixed(2)}</p>
                        <span className={`badge text-xs ${
                          p.status === "paid" ? "bg-green-100 text-green-700" :
                          p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {p.status === "paid" ? "Pago" : p.status === "pending" ? "Pendente" : "Falhou"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal bloquear */}
        {blockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-1">Bloquear aluno</h3>
              <p className="text-sm text-gray-500 mb-4">Informe o motivo do bloqueio</p>
              <input
                className="input mb-4"
                placeholder="Ex: Pagamento em atraso há 30 dias"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setBlockModal(false)} className="btn-ghost flex-1">Cancelar</button>
                <button
                  onClick={handleBlock}
                  disabled={!blockReason.trim() || blocking}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {blocking ? "Bloqueando..." : "Bloquear"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
