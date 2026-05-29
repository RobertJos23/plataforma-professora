"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Calendar, DollarSign, BookOpen, AlertTriangle,
  TrendingUp, Bell, LogOut, Clock, CheckCircle, XCircle,
  ChevronRight, Plus, FileText, MessageSquare, Zap
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { DarkModeToggle } from "@/components/DarkModeToggle";

interface DashboardData {
  students: { active: number; new_this_month: number; blocked: number };
  lessons: {
    this_week: number;
    today_completed: number;
    next: Array<{
      id: number;
      student_id: number;
      scheduled_at: string;
      topic?: string;
      status: string;
      meeting_url?: string;
    }>;
  };
  financial: { reference_month: string; received_brl: number; pending_brl: number };
  pending_corrections: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadDashboard();
  }, [isAuthenticated, user]);

  const loadDashboard = async () => {
    try {
      const { data: dashboard } = await adminApi.dashboard();
      setData(dashboard);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-gray-900 text-sm">Painel Admin</span>
              <span className="ml-2 badge bg-primary-100 text-primary-600 text-xs">Professora</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 text-sm text-gray-600 sm:flex">
              <span>Olá,</span>
              <span className="font-semibold">{user?.name?.split(" ")[0]}</span>
            </div>
            <DarkModeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Mês de referência: <strong>{data?.financial.reference_month}</strong>
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <Users className="h-5 w-5 text-blue-500" />
              {(data?.students.blocked ?? 0) > 0 && (
                <span className="badge bg-red-100 text-red-600 text-xs">
                  {data?.students.blocked} bloq.
                </span>
              )}
            </div>
            <p className="text-3xl font-bold font-display text-gray-900">{data?.students.active || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Alunos ativos</p>
            <p className="text-xs text-green-600 mt-0.5">+{data?.students.new_this_month || 0} esse mês</p>
          </div>

          <div className="card">
            <Calendar className="h-5 w-5 text-purple-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">{data?.lessons.this_week || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Aulas esta semana</p>
            <p className="text-xs text-gray-400 mt-0.5">{data?.lessons.today_completed || 0} hoje</p>
          </div>

          <div className="card">
            <DollarSign className="h-5 w-5 text-green-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">
              R$ {(data?.financial.received_brl || 0).toFixed(0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Recebido</p>
            <p className="text-xs text-orange-500 mt-0.5">
              R$ {(data?.financial.pending_brl || 0).toFixed(0)} pendente
            </p>
          </div>

          <div className="card">
            <FileText className="h-5 w-5 text-orange-500 mb-3" />
            <p className="text-3xl font-bold font-display text-gray-900">{data?.pending_corrections || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Para corrigir</p>
            {(data?.pending_corrections ?? 0) > 0 && (
              <Link href="/admin/exercicios/correcoes" className="text-xs text-primary-500 hover:underline mt-0.5 block">
                Ver agora →
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Próximas aulas */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                Próximas aulas
              </h2>
              <Link href="/admin/aulas/nova" className="btn-primary text-xs py-1.5">
                <Plus className="h-4 w-4" />
                Nova aula
              </Link>
            </div>

            {data?.lessons.next && data.lessons.next.length > 0 ? (
              <div className="space-y-3">
                {data.lessons.next.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                      <span className="text-xs font-bold">
                        {new Date(lesson.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit" })}
                      </span>
                      <span className="text-xs">
                        {new Date(lesson.scheduled_at).toLocaleDateString("pt-BR", { month: "short" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {lesson.topic || `Aula com aluno #${lesson.student_id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(lesson.scheduled_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${
                      lesson.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {lesson.status === "confirmed" ? "Confirmada" : "Agendada"}
                    </span>
                    {lesson.meeting_url && (
                      <a
                        href={lesson.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                      >
                        Entrar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Nenhuma aula próxima</p>
              </div>
            )}

            <Link
              href="/admin/aulas"
              className="mt-4 flex items-center justify-center gap-1 text-sm text-primary-500 hover:underline"
            >
              Ver todas as aulas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Ações rápidas */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Ações rápidas
              </h2>
              <div className="space-y-2">
                {[
                  { href: "/admin/alunos", icon: Users, label: "Gerenciar alunos", color: "text-blue-500" },
                  { href: "/admin/materiais/novo", icon: FileText, label: "Upload de material", color: "text-green-500" },
                  { href: "/admin/ia", icon: MessageSquare, label: "Gerar conteúdo com IA", color: "text-purple-500" },
                  { href: "/admin/financeiro", icon: DollarSign, label: "Relatório financeiro", color: "text-orange-500" },
                  { href: "/admin/comunicados", icon: Bell, label: "Enviar comunicado", color: "text-red-500" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Alerta inadimplentes */}
            {(data?.students.blocked ?? 0) > 0 && (
              <div className="card border-orange-200 bg-orange-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">
                      {data?.students.blocked} aluno(s) bloqueado(s)
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      Verificar pagamentos pendentes.
                    </p>
                    <Link
                      href="/admin/alunos?bloqueados=true"
                      className="mt-2 block text-xs font-medium text-orange-700 underline"
                    >
                      Ver agora
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
