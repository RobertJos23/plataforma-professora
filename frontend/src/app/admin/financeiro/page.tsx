"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp, Clock, CheckCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface MonthlyReport {
  reference_month: string;
  total_students: number;
  paid_count: number;
  pending_count: number;
  received_brl: number;
  pending_brl: number;
  payments: Array<{
    id: number;
    user_id: number;
    student_name?: string;
    amount: number;
    status: string;
    description?: string;
    created_at: string;
  }>;
}

export default function FinanceiroPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markForm, setMarkForm] = useState({ userId: "", amount: "", description: "" });

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    loadReport();
  }, [isAuthenticated, user, year, month]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.monthlyReport(year, month);
      setReport(data);
    } finally {
      setIsLoading(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(-1);
    try {
      await adminApi.markPaid(Number(markForm.userId), Number(markForm.amount), markForm.description);
      setShowMarkModal(false);
      setMarkForm({ userId: "", amount: "", description: "" });
      loadReport();
    } finally {
      setMarkingPaid(null);
    }
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-500 mt-1">Relatório mensal de pagamentos</p>
          </div>
          <button onClick={() => setShowMarkModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Registrar pagamento
          </button>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevMonth} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="font-display text-lg font-bold text-gray-900">
            {monthNames[month - 1]} {year}
          </span>
          <button onClick={nextMonth} disabled={year === now.getFullYear() && month === now.getMonth() + 1} className="rounded-xl border border-gray-200 p-2 hover:bg-gray-100 disabled:opacity-40">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <div className="card">
            <DollarSign className="h-5 w-5 text-green-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">
              R$ {(report?.received_brl || 0).toFixed(0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Recebido</p>
          </div>
          <div className="card">
            <Clock className="h-5 w-5 text-orange-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">
              R$ {(report?.pending_brl || 0).toFixed(0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Pendente</p>
          </div>
          <div className="card">
            <CheckCircle className="h-5 w-5 text-blue-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">{report?.paid_count || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Pagaram</p>
          </div>
          <div className="card">
            <TrendingUp className="h-5 w-5 text-purple-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">{report?.pending_count || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Pendentes</p>
          </div>
        </div>

        {/* Taxa de pagamento */}
        {(report?.total_students || 0) > 0 && (
          <div className="card mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Taxa de pagamento</span>
              <span className="font-bold text-gray-900">
                {Math.round(((report?.paid_count || 0) / (report?.total_students || 1)) * 100)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                style={{ width: `${((report?.paid_count || 0) / (report?.total_students || 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {report?.paid_count} de {report?.total_students} alunos
            </p>
          </div>
        )}

        {/* Lista de pagamentos */}
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pagamentos do mês</h2>
          </div>
          {(report?.payments || []).length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum pagamento registrado neste mês</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(report?.payments || []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {p.student_name || `Aluno #${p.user_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {p.description || "Mensalidade"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      R$ {p.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${
                        p.status === "paid" ? "bg-green-100 text-green-700" :
                        p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {p.status === "paid" ? "Pago" : p.status === "pending" ? "Pendente" : "Falhou"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden md:table-cell">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal registrar pagamento */}
        {showMarkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Registrar pagamento</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">ID do aluno *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="ID do aluno"
                    value={markForm.userId}
                    onChange={(e) => setMarkForm((f) => ({ ...f, userId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0,00"
                    value={markForm.amount}
                    onChange={(e) => setMarkForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Descrição</label>
                  <input
                    className="input"
                    placeholder="Ex: Mensalidade junho"
                    value={markForm.description}
                    onChange={(e) => setMarkForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowMarkModal(false)} className="btn-ghost flex-1">Cancelar</button>
                <button
                  onClick={handleMarkPaid}
                  disabled={!markForm.userId || !markForm.amount || markingPaid !== null}
                  className="btn-primary flex-1"
                >
                  {markingPaid !== null ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
