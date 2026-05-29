"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, TrendingUp, Flame, Calendar, Clock, Star, Trophy, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { progressApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

interface Progress {
  current_level: string;
  total_lessons_completed: number;
  total_hours_completed: number;
  total_points: number;
  current_streak: number;
  attendance_percentage: number;
  ai_recommendation?: string;
}

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface RankingEntry {
  rank: number;
  user_id: number;
  name: string;
  points: number;
  level: string;
  is_me: boolean;
}

const levelColors: Record<string, string> = {
  A1: "bg-gray-100 text-gray-600 border-gray-200",
  A2: "bg-blue-100 text-blue-600 border-blue-200",
  B1: "bg-green-100 text-green-600 border-green-200",
  B2: "bg-yellow-100 text-yellow-700 border-yellow-200",
  C1: "bg-orange-100 text-orange-600 border-orange-200",
  C2: "bg-red-100 text-red-600 border-red-200",
};

const levelProgress: Record<string, number> = {
  A1: 10, A2: 25, B1: 45, B2: 65, C1: 85, C2: 100,
};

export default function ProgressoPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    Promise.allSettled([
      progressApi.me(),
      progressApi.badges(),
      progressApi.ranking(),
    ]).then(([pRes, bRes, rRes]) => {
      if (pRes.status === "fulfilled") setProgress(pRes.value.data);
      if (bRes.status === "fulfilled") setBadges(bRes.value.data || []);
      if (rRes.status === "fulfilled") setRanking(rRes.value.data || []);
    }).finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const lvl = progress?.current_level || "A1";
  const pct = levelProgress[lvl] || 10;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Meu Progresso</h1>
          <p className="text-gray-500 mt-1">Acompanhe sua evolução no inglês</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
          {[
            { icon: TrendingUp, color: "text-primary-500 bg-primary-50", label: "Nível atual", value: progress?.current_level || "—" },
            { icon: Star, color: "text-yellow-500 bg-yellow-50", label: "Pontos totais", value: String(progress?.total_points || 0) },
            { icon: Flame, color: "text-orange-500 bg-orange-50", label: "Sequência", value: `${progress?.current_streak || 0} dias 🔥` },
            { icon: Calendar, color: "text-green-500 bg-green-50", label: "Frequência", value: `${progress?.attendance_percentage || 0}%` },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xl font-bold font-display text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Nível CEFR */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                Nível CEFR
              </h2>
              <div className="flex items-center justify-between mb-3">
                <span className={`badge text-sm px-3 py-1 border ${levelColors[lvl] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {lvl}
                </span>
                <span className="text-sm text-gray-500">{pct}% da jornada completa</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                  <span key={l} className={`text-xs ${l === lvl ? "font-bold text-primary-600" : "text-gray-400"}`}>
                    {l}
                  </span>
                ))}
              </div>

              {!progress?.current_level || progress.current_level === "A1" ? (
                <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Faça o teste de nivelamento para calibrar seu nível.</p>
                  <Link href="/dashboard/nivelamento" className="btn-primary py-1.5 text-xs shrink-0 ml-3">
                    Iniciar
                  </Link>
                </div>
              ) : null}
            </div>

            {/* Estatísticas detalhadas */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Estatísticas
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Calendar, color: "text-blue-500", label: "Aulas concluídas", value: progress?.total_lessons_completed || 0 },
                  { icon: Clock, color: "text-green-500", label: "Horas de estudo", value: `${progress?.total_hours_completed || 0}h` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-gray-50 p-4">
                    <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                    <p className="text-2xl font-bold font-display text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conquistas */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Conquistas ({badges.length})
              </h2>
              {badges.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Nenhuma conquista ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Continue estudando para desbloquear!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center rounded-xl bg-yellow-50 border border-yellow-100 p-4 text-center">
                      <span className="text-3xl mb-2">{badge.icon || "🏆"}</span>
                      <p className="text-xs font-semibold text-gray-900">{badge.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ranking */}
          <div className="card h-fit">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Ranking da turma
            </h2>
            {ranking.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Sem dados de ranking</p>
            ) : (
              <div className="space-y-2">
                {ranking.slice(0, 10).map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 rounded-xl p-3 ${
                      entry.is_me ? "bg-primary-50 border border-primary-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-6 text-center text-sm font-bold ${
                      entry.rank === 1 ? "text-yellow-500" :
                      entry.rank === 2 ? "text-gray-400" :
                      entry.rank === 3 ? "text-orange-400" :
                      "text-gray-400"
                    }`}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                      {entry.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${entry.is_me ? "text-primary-700" : "text-gray-900"}`}>
                        {entry.is_me ? "Você" : entry.name.split(" ")[0]}
                      </p>
                      <p className="text-xs text-gray-400">{entry.level}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-600">⭐ {entry.points}</span>
                  </div>
                ))}
              </div>
            )}

            {progress?.ai_recommendation && (
              <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-3">
                <p className="text-xs font-semibold text-primary-800 mb-1">🤖 Lily sugere:</p>
                <p className="text-xs text-primary-700">{progress.ai_recommendation}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
