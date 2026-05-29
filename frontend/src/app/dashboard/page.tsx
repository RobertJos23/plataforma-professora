"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Calendar, Award, TrendingUp, Bell, MessageCircle,
  Play, FileText, Mic, LogOut, ChevronRight, Star, Clock, Flame
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { lessonsApi, progressApi, materialsApi } from "@/lib/api";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface Lesson {
  id: number;
  scheduled_at: string;
  topic?: string;
  status: string;
  meeting_url?: string;
}

interface Progress {
  current_level: string;
  total_lessons_completed: number;
  total_hours_completed: number;
  total_points: number;
  current_streak: number;
  attendance_percentage: number;
  ai_recommendation?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }
    loadData();
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      const [lessonRes, progressRes, notifRes] = await Promise.allSettled([
        lessonsApi.nextLesson(),
        progressApi.me(),
        progressApi.notifications(true),
      ]);

      if (lessonRes.status === "fulfilled") setNextLesson(lessonRes.value.data);
      if (progressRes.status === "fulfilled") setProgress(progressRes.value.data);
      if (notifRes.status === "fulfilled") setNotifications(notifRes.value.data?.slice(0, 3) || []);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const levelColors: Record<string, string> = {
    A1: "bg-gray-100 text-gray-600",
    A2: "bg-blue-100 text-blue-600",
    B1: "bg-green-100 text-green-600",
    B2: "bg-yellow-100 text-yellow-700",
    C1: "bg-orange-100 text-orange-600",
    C2: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar / Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold text-gray-900 text-sm hidden sm:block">
              Pascini English
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Notificações */}
            <button className="relative rounded-lg p-2 hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-500" />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-gray-700 sm:block">{user?.name}</span>
            </div>

            <DarkModeToggle />
            <button
              onClick={logout}
              className="rounded-lg p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-12">
        {/* Saudação */}
        <div className="mb-8 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Olá, {user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Continue sua jornada rumo à fluência.</p>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <div className="card text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-primary-500 mb-2" />
            <p className="text-2xl font-bold font-display text-gray-900">
              {progress?.current_level || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Nível atual</p>
          </div>
          <div className="card text-center">
            <Calendar className="mx-auto h-6 w-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold font-display text-gray-900">
              {progress?.total_lessons_completed || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Aulas concluídas</p>
          </div>
          <div className="card text-center">
            <Clock className="mx-auto h-6 w-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold font-display text-gray-900">
              {progress?.total_hours_completed || 0}h
            </p>
            <p className="text-xs text-gray-500 mt-1">Horas de estudo</p>
          </div>
          <div className="card text-center">
            <Flame className="mx-auto h-6 w-6 text-orange-500 mb-2" />
            <p className="text-2xl font-bold font-display text-gray-900">
              {progress?.current_streak || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Dias seguidos 🔥</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Coluna principal */}
          <div className="space-y-6 lg:col-span-2">
            {/* Próxima aula */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                Próxima aula
              </h2>
              {nextLesson ? (
                <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {nextLesson.topic || "Aula de inglês"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(nextLesson.scheduled_at).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`badge ${
                      nextLesson.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {nextLesson.status === "confirmed" ? "Confirmada" : "Aguardando"}
                    </span>
                  </div>
                  {nextLesson.meeting_url && (
                    <a
                      href={nextLesson.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-4 text-sm py-2"
                    >
                      <Play className="h-4 w-4" />
                      Entrar na aula
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Nenhuma aula agendada</p>
                  <p className="text-xs text-gray-400 mt-1">Fale com a professora para agendar</p>
                </div>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Acessar rapidamente</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { href: "/dashboard/materiais", icon: FileText, label: "Materiais", color: "text-blue-500 bg-blue-50" },
                  { href: "/dashboard/exercicios", icon: BookOpen, label: "Exercícios", color: "text-green-500 bg-green-50" },
                  { href: "/dashboard/ia-chat", icon: MessageCircle, label: "Dúvidas IA", color: "text-purple-500 bg-purple-50" },
                  { href: "/dashboard/progresso", icon: TrendingUp, label: "Progresso", color: "text-orange-500 bg-orange-50" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 border border-gray-100"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recomendação IA */}
            {progress?.ai_recommendation && (
              <div className="card border-l-4 border-l-primary-500">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm">
                    🤖
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Lily recomenda</p>
                    <p className="mt-1 text-sm text-gray-600">{progress.ai_recommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            {/* Pontos e nível */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Meu progresso
              </h2>

              <div className="text-center mb-4">
                <span className={`badge text-base px-4 py-1.5 ${levelColors[progress?.current_level || "A1"]}`}>
                  {progress?.current_level || "Não avaliado"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pontos totais</span>
                  <span className="font-bold text-primary-500">⭐ {progress?.total_points || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequência</span>
                  <span className="font-bold text-green-600">{progress?.attendance_percentage || 0}%</span>
                </div>
              </div>

              <Link href="/dashboard/progresso" className="btn-secondary w-full mt-4 text-sm py-2">
                Ver detalhes
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Notificações recentes */}
            {notifications.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  Novidades
                </h2>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teste de nivelamento */}
            {!progress?.current_level || progress.current_level === "A1" ? (
              <div className="card bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100 dark:from-primary-900/40 dark:to-accent-900/40 dark:border-primary-800">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Faça o nivelamento</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Descubra seu nível real de inglês em apenas 10 perguntas.
                </p>
                <Link href="/dashboard/nivelamento" className="btn-primary w-full text-sm py-2">
                  Iniciar teste
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
