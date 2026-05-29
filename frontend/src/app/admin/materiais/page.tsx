"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Trash2, Video, Headphones, File, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { materialsApi, adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

interface Material {
  id: number;
  title: string;
  description?: string;
  type: string;
  level?: string;
  plan_required: string;
  created_at: string;
}

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText, video: Video, audio: Headphones,
};

const typeLabels: Record<string, string> = {
  pdf: "PDF", video: "Vídeo", audio: "Áudio", image: "Imagem", other: "Arquivo",
};

export default function AdminMateriaisPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
    materialsApi.list().then((r) => setMaterials(r.data || [])).finally(() => setIsLoading(false));
  }, [isAuthenticated, user]);

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este material?")) return;
    setDeleting(id);
    try {
      await adminApi.deleteMaterial(id);
      setMaterials((ms) => ms.filter((m) => m.id !== id));
    } catch {
      alert("Erro ao excluir material.");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = materials.filter((m) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="font-display text-2xl font-bold text-gray-900">Materiais</h1>
            <p className="text-gray-500 mt-1">{materials.length} materiais cadastrados</p>
          </div>
          <Link href="/admin/materiais/novo" className="btn-primary">
            <Plus className="h-4 w-4" /> Novo material
          </Link>
        </div>

        <div className="relative mb-6 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9 py-2" placeholder="Buscar material..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum material encontrado</p>
            <Link href="/admin/materiais/novo" className="btn-primary mt-4">Adicionar primeiro material</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => {
              const Icon = typeIcons[m.type] || File;
              return (
                <div key={m.id} className="card flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                      <Icon className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                      {m.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="badge bg-gray-100 text-gray-600">{typeLabels[m.type] || "Arquivo"}</span>
                    {m.level && <span className="badge bg-blue-100 text-blue-600">{m.level}</span>}
                    <span className="badge bg-purple-100 text-purple-600 capitalize">{m.plan_required}</span>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleting === m.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting === m.id ? "..." : "Excluir"}
                    </button>
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
