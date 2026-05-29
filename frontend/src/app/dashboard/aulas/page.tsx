"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Clock, XCircle, Play, Star } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { lessonsApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

interface Lesson {
  id: number;
  scheduled_at: string;
  topic?: string;
  status: string;
  meeting_url?: string;
  rating?: number;
  feedback?: string;
  summary?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: "Agendada", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-600", icon: XCircle },
  missed: { label: "Faltou", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

export default function AulasPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; rating: number; text: string } | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    lessonsApi.myLessons().then((r) => setLessons(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const handleConfirm = async (id: number) => {
    setConfirming(id);
    try {
      await lessonsApi.confirm(id);
      setLessons((ls) => ls.map((l) => l.id === id ? { ...l, status: "confirmed" } : l));
    } finally {
      setConfirming(null);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) return;
    setSubmittingFeedback(true);
    try {
      await lessonsApi.feedback(feedback.id, feedback.rating, feedback.text);
      setLessons((ls) => ls.map((l) =>
        l.id === feedback.id ? { ...l, rating: feedback.rating, feedback: feedback.text } : l
      ));
      setFeedback(null);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const filtered = lessons.filter((l) => !statusFilter || l.status === statusFilter);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Minhas Aulas</h1>
          <p className="text-gray-500 mt-1">Histórico e próximas aulas</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input max-w-[180px] py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {statusFilter && (
            <button onClick={() => setStatusFilter("")} className="btn-ghost py-2 text-sm">Limpar</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma aula encontrada</p>
            <p className="text-xs text-gray-400 mt-1">Fale com a professora para agendar sua próxima aula</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((lesson) => {
              const sc = statusConfig[lesson.status] || statusConfig.scheduled;
              const StatusIcon = sc.icon;
              const date = new Date(lesson.scheduled_at);
              const isPast = date < new Date();
              const canConfirm = lesson.status === "scheduled" && !isPast;
              const canFeedback = lesson.status === "completed" && !lesson.rating;

              return (
                <div key={lesson.id} className="card">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <span className="text-sm font-bold">{date.toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                      <span className="text-xs">{date.toLocaleDateString("pt-BR", { month: "short" })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{lesson.topic || "Aula de inglês"}</h3>
                        <span className={`badge ${sc.color}`}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {date.toLocaleDateString("pt-BR", { weekday: "long" })},{" "}
                        {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {lesson.summary && (
                        <p className="text-sm text-gray-600 mt-2 rounded-lg bg-gray-50 p-2">{lesson.summary}</p>
                      )}
                      {lesson.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= lesson.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                          {lesson.feedback && <span className="text-xs text-gray-500 ml-1">"{lesson.feedback}"</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {lesson.meeting_url && !isPast && (
                        <a href={lesson.meeting_url} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 text-xs">
                          <Play className="h-3.5 w-3.5" /> Entrar
                        </a>
                      )}
                      {canConfirm && (
                        <button
                          onClick={() => handleConfirm(lesson.id)}
                          disabled={confirming === lesson.id}
                          className="btn-secondary py-1.5 text-xs"
                        >
                          {confirming === lesson.id ? "..." : "Confirmar"}
                        </button>
                      )}
                      {canFeedback && (
                        <button
                          onClick={() => setFeedback({ id: lesson.id, rating: 5, text: "" })}
                          className="btn-ghost py-1.5 text-xs"
                        >
                          <Star className="h-3.5 w-3.5" /> Avaliar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de feedback */}
        {feedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Avaliar aula</h3>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFeedback((f) => f ? { ...f, rating: s } : f)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        s <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Comentário (opcional)"
                value={feedback.text}
                onChange={(e) => setFeedback((f) => f ? { ...f, text: e.target.value } : f)}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setFeedback(null)} className="btn-ghost flex-1">Cancelar</button>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={submittingFeedback}
                  className="btn-primary flex-1"
                >
                  {submittingFeedback ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
