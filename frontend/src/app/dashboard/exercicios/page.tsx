"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { exercisesApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

interface Exercise {
  id: number;
  title: string;
  description?: string;
  type: string;
  level?: string;
  points: number;
}

interface Submission {
  exercise_id: number;
  score?: number;
  status: string;
  submitted_at: string;
}

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla escolha",
  essay: "Redação",
  fill_blank: "Preencher lacuna",
  translation: "Tradução",
};

const levelColors: Record<string, string> = {
  A1: "bg-gray-100 text-gray-600",
  A2: "bg-blue-100 text-blue-600",
  B1: "bg-green-100 text-green-600",
  B2: "bg-yellow-100 text-yellow-700",
  C1: "bg-orange-100 text-orange-600",
};

export default function ExerciciosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissions, setSubmissions] = useState<Map<number, Submission>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    Promise.allSettled([
      exercisesApi.list(),
      exercisesApi.mySubmissions(),
    ]).then(([exRes, subRes]) => {
      if (exRes.status === "fulfilled") setExercises(exRes.value.data);
      if (subRes.status === "fulfilled") {
        const map = new Map<number, Submission>();
        (subRes.value.data || []).forEach((s: Submission) => map.set(s.exercise_id, s));
        setSubmissions(map);
      }
    }).finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const filtered = exercises.filter((e) =>
    (!levelFilter || e.level === levelFilter) && (!typeFilter || e.type === typeFilter)
  );

  const getStatus = (id: number) => {
    const sub = submissions.get(id);
    if (!sub) return null;
    return sub.status;
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
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Exercícios</h1>
          <p className="text-gray-500 mt-1">Pratique e receba correção automática da IA</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input max-w-[160px] py-2" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">Todos os níveis</option>
            {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className="input max-w-[200px] py-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(levelFilter || typeFilter) && (
            <button onClick={() => { setLevelFilter(""); setTypeFilter(""); }} className="btn-ghost py-2 text-sm">
              Limpar
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum exercício disponível</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ex) => {
              const status = getStatus(ex.id);
              const sub = submissions.get(ex.id);
              return (
                <div key={ex.id} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                    <BookOpen className="h-5 w-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{ex.title}</h3>
                      {ex.level && (
                        <span className={`badge ${levelColors[ex.level] || "bg-gray-100 text-gray-600"}`}>
                          {ex.level}
                        </span>
                      )}
                      <span className="badge bg-gray-100 text-gray-600">
                        {typeLabels[ex.type] || ex.type}
                      </span>
                    </div>
                    {ex.description && (
                      <p className="text-sm text-gray-500 truncate">{ex.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">⭐ {ex.points} pontos</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {status === "graded" && sub?.score !== undefined && (
                      <span className="text-sm font-bold text-green-600">{sub.score}%</span>
                    )}
                    {status === "graded" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : status === "submitted" ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : null}
                    <Link
                      href={`/dashboard/exercicios/${ex.id}`}
                      className="btn-primary py-2 text-sm"
                    >
                      {status ? "Ver" : "Fazer"}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
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
