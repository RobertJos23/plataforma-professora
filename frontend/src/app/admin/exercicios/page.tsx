"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, Trash2, Search, ClipboardList } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { exercisesApi, adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Exercise {
  id: number;
  title: string;
  description?: string;
  type: string;
  level?: string;
  points: number;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  multiple_choice: "Múltipla escolha",
  essay: "Redação",
  fill_blank: "Lacuna",
  translation: "Tradução",
};

export default function AdminExerciciosPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "multiple_choice", level: "", points: "10", content: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    exercisesApi.list().then((r) => setExercises(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated, user]);

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este exercício?")) return;
    setDeleting(id);
    try {
      await adminApi.deleteExercise(id);
      setExercises((es) => es.filter((e) => e.id !== id));
    } catch {
      alert("Erro ao excluir.");
    } finally {
      setDeleting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);
    try {
      let parsedContent;
      try {
        parsedContent = JSON.parse(form.content);
      } catch {
        parsedContent = { question: form.content };
      }
      const { data } = await adminApi.createExercise({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        level: form.level || undefined,
        points: Number(form.points),
        content: parsedContent,
      });
      setExercises((es) => [data, ...es]);
      setShowCreate(false);
      setForm({ title: "", description: "", type: "multiple_choice", level: "", points: "10", content: "" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(msg || "Erro ao criar exercício.");
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = exercises.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="font-display text-2xl font-bold text-gray-900">Exercícios</h1>
            <p className="text-gray-500 mt-1">{exercises.length} exercícios cadastrados</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/exercicios/correcoes" className="btn-secondary py-2 text-sm">
              <ClipboardList className="h-4 w-4" /> Correções pendentes
            </Link>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Novo exercício
            </button>
          </div>
        </div>

        <div className="relative mb-6 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9 py-2" placeholder="Buscar exercício..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum exercício encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ex) => (
              <div key={ex.id} className="card flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                  <BookOpen className="h-5 w-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{ex.title}</h3>
                    <span className="badge bg-gray-100 text-gray-600">{typeLabels[ex.type] || ex.type}</span>
                    {ex.level && <span className="badge bg-blue-100 text-blue-600">{ex.level}</span>}
                  </div>
                  <p className="text-xs text-gray-400">⭐ {ex.points} pontos</p>
                </div>
                <button
                  onClick={() => handleDelete(ex.id)}
                  disabled={deleting === ex.id}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting === ex.id ? "..." : "Excluir"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal criar exercício */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl my-4">
              <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Novo Exercício</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Título *</label>
                  <input required className="input" placeholder="Título do exercício" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipo *</label>
                    <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Nível</label>
                    <select className="input" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                      <option value="">Todos</option>
                      {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Pontos</label>
                  <input type="number" min="1" max="100" className="input" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} />
                </div>
                <div>
                  <label className="label">
                    Conteúdo (JSON ou texto simples)
                    <span className="text-gray-400 font-normal ml-1 text-xs">Para múltipla escolha: {`{"question":"...","options":["a","b","c","d"],"correct_answer":"a"}`}</span>
                  </label>
                  <textarea
                    required
                    className="input resize-none font-mono text-xs"
                    rows={4}
                    placeholder='{"question": "Choose...", "options": ["A", "B", "C", "D"], "correct_answer": "A"}'
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  />
                </div>
                {createError && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{createError}</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancelar</button>
                  <button type="submit" disabled={isCreating} className="btn-primary flex-1">
                    {isCreating ? "Criando..." : "Criar exercício"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
