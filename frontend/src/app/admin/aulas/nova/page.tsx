"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Student {
  id: number;
  full_name: string;
  email: string;
}

export default function NovaAulaPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({
    student_id: "",
    scheduled_at: "",
    topic: "",
    meeting_url: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    adminApi.students().then((r) => setStudents(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated, user]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await adminApi.createLesson({
        student_id: Number(form.student_id),
        scheduled_at: form.scheduled_at,
        topic: form.topic || undefined,
        meeting_url: form.meeting_url || undefined,
        notes: form.notes || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Erro ao criar aula. Verifique os dados.");
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
      <main className="mx-auto max-w-2xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/admin/aulas" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para aulas
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Nova Aula</h1>
          <p className="text-gray-500 mt-1">Agende uma aula para um aluno</p>
        </div>

        {success ? (
          <div className="card text-center py-10">
            <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Aula agendada!</h2>
            <p className="text-gray-500 mb-6">O aluno será notificado automaticamente.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setSuccess(false); setForm({ student_id: "", scheduled_at: "", topic: "", meeting_url: "", notes: "" }); }} className="btn-primary">
                Agendar outra
              </button>
              <Link href="/admin/aulas" className="btn-secondary">Ver agenda</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-5">
            <div>
              <label className="label">Aluno *</label>
              <select
                required
                className="input"
                value={form.student_id}
                onChange={(e) => set("student_id", e.target.value)}
              >
                <option value="">Selecionar aluno...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {s.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Data e horário *</label>
              <input
                required
                type="datetime-local"
                className="input"
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="label">Tópico da aula</label>
              <input
                className="input"
                placeholder="Ex: Present Perfect, Business English..."
                value={form.topic}
                onChange={(e) => set("topic", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Link da reunião (Zoom/Meet)</label>
              <input
                type="url"
                className="input"
                placeholder="https://..."
                value={form.meeting_url}
                onChange={(e) => set("meeting_url", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Notas internas</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Observações para você (não visíveis ao aluno)"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/admin/aulas" className="btn-ghost flex-1">Cancelar</Link>
              <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {isSubmitting ? "Agendando..." : "Agendar aula"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
