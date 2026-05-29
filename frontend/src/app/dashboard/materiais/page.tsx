"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, Lock, Video, Headphones, Image, File } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { materialsApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

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
  pdf: FileText,
  video: Video,
  audio: Headphones,
  image: Image,
};

const typeLabels: Record<string, string> = {
  pdf: "PDF",
  video: "Vídeo",
  audio: "Áudio",
  image: "Imagem",
  other: "Arquivo",
};

const levelColors: Record<string, string> = {
  A1: "bg-gray-100 text-gray-600",
  A2: "bg-blue-100 text-blue-600",
  B1: "bg-green-100 text-green-600",
  B2: "bg-yellow-100 text-yellow-700",
  C1: "bg-orange-100 text-orange-600",
  C2: "bg-red-100 text-red-600",
};

const planOrder: Record<string, number> = { basic: 1, standard: 2, premium: 3 };

export default function MateriaisPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    materialsApi.list().then((r) => setMaterials(r.data)).finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const canAccess = (planRequired: string) => {
    const userPlan = user?.plan || "basic";
    return (planOrder[userPlan] || 1) >= (planOrder[planRequired] || 1);
  };

  const handleDownload = async (id: number) => {
    setDownloading(id);
    try {
      const { data } = await materialsApi.download(id);
      window.open(data.url, "_blank");
    } catch {
      alert("Não foi possível abrir o arquivo.");
    } finally {
      setDownloading(null);
    }
  };

  const filtered = materials.filter((m) =>
    (!level || m.level === level) && (!type || m.type === type)
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
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Materiais de Estudo</h1>
          <p className="text-gray-500 mt-1">Apostilas, vídeos e áudios para praticar</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input max-w-[160px] py-2" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Todos os níveis</option>
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <select className="input max-w-[160px] py-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(level || type) && (
            <button onClick={() => { setLevel(""); setType(""); }} className="btn-ghost py-2 text-sm">
              Limpar
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum material encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => {
              const Icon = typeIcons[m.type] || File;
              const accessible = canAccess(m.plan_required);
              return (
                <div key={m.id} className={`card relative flex flex-col ${!accessible ? "opacity-80" : ""}`}>
                  {!accessible && <Lock className="absolute right-4 top-4 h-4 w-4 text-gray-400" />}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                      <Icon className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                      {m.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="badge bg-gray-100 text-gray-600">{typeLabels[m.type] || "Arquivo"}</span>
                    {m.level && (
                      <span className={`badge ${levelColors[m.level] || "bg-gray-100 text-gray-600"}`}>{m.level}</span>
                    )}
                    {m.plan_required !== "basic" && (
                      <span className="badge bg-purple-100 text-purple-600 capitalize">{m.plan_required}</span>
                    )}
                  </div>
                  <div className="mt-auto">
                    {accessible ? (
                      <button
                        onClick={() => handleDownload(m.id)}
                        disabled={downloading === m.id}
                        className="btn-primary w-full py-2 text-sm"
                      >
                        {downloading === m.id
                          ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          : <Download className="h-4 w-4" />}
                        {downloading === m.id ? "Abrindo..." : "Baixar"}
                      </button>
                    ) : (
                      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-center">
                        <p className="text-xs text-gray-500">
                          Plano <strong className="capitalize">{m.plan_required}</strong> ou superior
                        </p>
                      </div>
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
