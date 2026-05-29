"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, Search, XCircle, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Lesson {
  id: number;
  student_id: number;
  student_name?: string;
  scheduled_at: string;
  topic?: string;
  status: string;
  meeting_url?: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendada", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-600" },
  missed: { label: "Faltou", color: "bg-gray-100 text-gray-600" },
};

export default function AdminAulasPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    adminApi.allLessons().then((r) => setLessons(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated, user]);

  const handleCancel = async (id: number) => {
    if (!confirm("Cancelar esta aula?")) return;
    setCancelling(id);
    try {
      await adminApi.cancelLesson(id);
      setLessons((ls) => ls.map((l) => l.id === id ? { ...l, status: "cancelled" } : l));
    } finally {
      setCancelling(null);
    }
  };

  const filtered = lessons.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (search && !(l.student_name || "").toLowerCase().includes(search.toLowerCase()) &&
        !(l.topic || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
      <main className="mx-auto max-w-7xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Agenda de Aulas</h1>
            <p className="text-gray-500 mt-1">{lessons.length} aulas registradas</p>
          </div>
          <Link href="/admin/aulas/nova" className="btn-primary">
            <Plus className="h-4 w-4" /> Nova aula
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="input pl-9 py-2" placeholder="Buscar aluno ou tópico..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input max-w-[180px] py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhuma aula encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lesson) => {
              const sc = statusConfig[lesson.status] || statusConfig.scheduled;
              const date = new Date(lesson.scheduled_at);
              const isPast = date < new Date();
              return (
                <div key={lesson.id} className="card flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <span className="text-sm font-bold">{date.toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                    <span className="text-xs">{date.toLocaleDateString("pt-BR", { month: "short" })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{lesson.topic || "Aula"}</h3>
                      <span className={`badge ${sc.color}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {lesson.student_name || `Aluno #${lesson.student_id}`} ·{" "}
                      {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lesson.meeting_url && !isPast && (
                      <a href={lesson.meeting_url} target="_blank" rel="noopener noreferrer"
                        className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600">
                        <Play className="inline h-3.5 w-3.5 mr-1" />Entrar
                      </a>
                    )}
                    {lesson.status !== "cancelled" && lesson.status !== "completed" && (
                      <button
                        onClick={() => handleCancel(lesson.id)}
                        disabled={cancelling === lesson.id}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {cancelling === lesson.id ? "..." : "Cancelar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
