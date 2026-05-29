"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Lock, Unlock, ChevronRight, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Student {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  plan?: string;
  current_level?: string;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
}

const planColors: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-600",
  premium: "bg-purple-100 text-purple-600",
};

export default function AlunosPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [blocking, setBlocking] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState<{ id: number; reason: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    loadStudents();
  }, [isAuthenticated, user]);

  const loadStudents = async () => {
    try {
      const { data } = await adminApi.students();
      setStudents(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (id: number) => {
    setBlocking(id);
    try {
      await adminApi.unblockStudent(id);
      setStudents((ss) => ss.map((s) => s.id === id ? { ...s, is_blocked: false } : s));
    } finally {
      setBlocking(null);
    }
  };

  const handleBlock = async () => {
    if (!blockReason) return;
    setBlocking(blockReason.id);
    try {
      await adminApi.blockStudent(blockReason.id, blockReason.reason);
      setStudents((ss) => ss.map((s) => s.id === blockReason.id ? { ...s, is_blocked: true } : s));
      setBlockReason(null);
    } finally {
      setBlocking(null);
    }
  };

  const filtered = students.filter((s) => {
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter && s.plan !== planFilter) return false;
    if (blockedOnly && !s.is_blocked) return false;
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
        <div className="mb-6 mt-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Alunos</h1>
            <p className="text-gray-500 mt-1">{students.length} alunos cadastrados</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input pl-9 py-2"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input max-w-[160px] py-2" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="">Todos os planos</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
              className="accent-primary-500"
            />
            <span className="text-sm text-gray-700">Apenas bloqueados</span>
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum aluno encontrado</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Nível</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                          {s.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className={`badge capitalize ${planColors[s.plan || "basic"]}`}>
                        {s.plan || "basic"}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{s.current_level || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      {s.is_blocked ? (
                        <span className="badge bg-red-100 text-red-600">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Bloqueado
                        </span>
                      ) : (
                        <span className="badge bg-green-100 text-green-600">Ativo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.is_blocked ? (
                          <button
                            onClick={() => handleUnblock(s.id)}
                            disabled={blocking === s.id}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            {blocking === s.id ? "..." : "Desbloquear"}
                          </button>
                        ) : (
                          <button
                            onClick={() => setBlockReason({ id: s.id, reason: "" })}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Lock className="h-3.5 w-3.5" /> Bloquear
                          </button>
                        )}
                        <Link
                          href={`/admin/alunos/${s.id}`}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Ver <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal bloquear */}
        {blockReason && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-1">Bloquear aluno</h3>
              <p className="text-sm text-gray-500 mb-4">Informe o motivo do bloqueio</p>
              <input
                className="input mb-4"
                placeholder="Ex: Pagamento em atraso"
                value={blockReason.reason}
                onChange={(e) => setBlockReason((b) => b ? { ...b, reason: e.target.value } : b)}
              />
              <div className="flex gap-3">
                <button onClick={() => setBlockReason(null)} className="btn-ghost flex-1">Cancelar</button>
                <button
                  onClick={handleBlock}
                  disabled={!blockReason.reason.trim() || !!blocking}
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
