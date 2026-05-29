"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

export default function NovoMaterialPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "pdf",
    level: "",
    plan_required: "basic",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<"idle" | "creating" | "uploading" | "done">("idle");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); }
  }, [isAuthenticated, user]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      setUploadProgress("creating");
      const { data: material } = await adminApi.createMaterial({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        level: form.level || undefined,
        plan_required: form.plan_required,
      });

      if (file) {
        setUploadProgress("uploading");
        await adminApi.uploadMaterial(material.id, file);
      }

      setUploadProgress("done");
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Erro ao criar material.");
      setUploadProgress("idle");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <main className="mx-auto max-w-2xl px-4 pt-20 pb-12">
          <div className="card text-center py-10 mt-8">
            <CheckCircle className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Material criado!</h2>
            <p className="text-gray-500 mb-6">O material já está disponível para os alunos.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setSuccess(false); setForm({ title: "", description: "", type: "pdf", level: "", plan_required: "basic" }); setFile(null); setUploadProgress("idle"); }} className="btn-primary">
                Criar outro
              </button>
              <Link href="/admin/materiais" className="btn-secondary">Ver materiais</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/admin/materiais" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para materiais
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Novo Material</h1>
          <p className="text-gray-500 mt-1">Adicione um material de estudo para os alunos</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="label">Título *</label>
            <input
              required
              className="input"
              placeholder="Ex: Present Perfect — Apostila Completa"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Breve descrição do material..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="video">Vídeo</option>
                <option value="audio">Áudio</option>
                <option value="image">Imagem</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="label">Nível CEFR</label>
              <select className="input" value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="">Todos os níveis</option>
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Plano mínimo *</label>
            <select className="input" value={form.plan_required} onChange={(e) => set("plan_required", e.target.value)}>
              <option value="basic">Basic (todos)</option>
              <option value="standard">Standard ou superior</option>
              <option value="premium">Premium apenas</option>
            </select>
          </div>

          <div>
            <label className="label">Arquivo (opcional)</label>
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="rounded-lg p-1 hover:bg-gray-200">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">Clique para selecionar um arquivo</span>
                <span className="text-xs text-gray-400">PDF, MP3, MP4, JPG, PNG...</span>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          {uploadProgress === "uploading" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
              Enviando arquivo para o S3...
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/admin/materiais" className="btn-ghost flex-1">Cancelar</Link>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {uploadProgress === "uploading" ? "Enviando arquivo..." : "Criando..."}</>
              ) : (
                <><Upload className="h-4 w-4" />Criar material</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
