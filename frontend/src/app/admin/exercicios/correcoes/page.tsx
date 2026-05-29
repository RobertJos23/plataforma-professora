"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Submission {
  id: number;
  exercise_id: number;
  student_id: number;
  student_name?: string;
  exercise_title?: string;
  exercise_type?: string;
  answer: Record<string, unknown>;
  submitted_at: string;
  status: string;
}

export default function CorrecoesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grading, setGrading] = useState<{ id: number; grade: number; feedback: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    adminApi.pendingSubmissions().then((r) => setSubmissions(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated, user]);

  const handleGrade = async () => {
    if (!grading) return;
    setIsSubmitting(true);
    try {
      await adminApi.gradeSubmission(grading.id, grading.grade, grading.feedback);
      setSubmissions((ss) => ss.filter((s) => s.id !== grading.id));
      setGrading(null);
    } catch {
      alert("Erro ao enviar correção.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/admin/exercicios" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para exercícios
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Correções Pendentes</h1>
          <p className="text-gray-500 mt-1">{submissions.length} submissões aguardando correção</p>
        </div>

        {submissions.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-3" />
            <p className="font-semibold text-gray-900">Tudo em dia!</p>
            <p className="text-sm text-gray-500 mt-1">Nenhuma submissão pendente de correção</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const answerText =
                typeof sub.answer === "object"
                  ? (sub.answer as { text?: string }).text || JSON.stringify(sub.answer, null, 2)
                  : String(sub.answer);

              return (
                <div key={sub.id} className="card">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{sub.exercise_title || `Exercício #${sub.exercise_id}`}</h3>
                      <p className="text-sm text-gray-500">
                        {sub.student_name || `Aluno #${sub.student_id}`} ·{" "}
                        {new Date(sub.submitted_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <span className="badge bg-yellow-100 text-yellow-700">Aguardando correção</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resposta do aluno:</p>
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{answerText}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setGrading({ id: sub.id, grade: 75, feedback: "" })}
                    className="btn-primary py-2 text-sm"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Corrigir
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de correção */}
        {grading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Corrigir exercício</h3>

              <div className="mb-4">
                <label className="label">Nota (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={grading.grade}
                  onChange={(e) => setGrading((g) => g ? { ...g, grade: Number(e.target.value) } : g)}
                />
              </div>

              <div className="mb-4">
                <label className="label">Feedback para o aluno</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Escreva um feedback detalhado sobre os pontos fortes e de melhoria..."
                  value={grading.feedback}
                  onChange={(e) => setGrading((g) => g ? { ...g, feedback: e.target.value } : g)}
                />
              </div>

              {/* Indicador de nota */}
              <div className={`mb-4 rounded-xl p-3 text-center text-sm font-semibold ${
                grading.grade >= 70 ? "bg-green-50 text-green-700" :
                grading.grade >= 50 ? "bg-yellow-50 text-yellow-700" :
                "bg-red-50 text-red-700"
              }`}>
                {grading.grade >= 70 ? "✅ Aprovado" : grading.grade >= 50 ? "⚠️ Regular" : "❌ Reprovado"} — {grading.grade}/100
              </div>

              <div className="flex gap-3">
                <button onClick={() => setGrading(null)} className="btn-ghost flex-1">Cancelar</button>
                <button
                  onClick={handleGrade}
                  disabled={isSubmitting || !grading.feedback.trim()}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? "Enviando..." : "Enviar correção"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
