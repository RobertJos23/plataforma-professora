"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, BookOpen, FileText, MessageSquare, Copy, Check, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi, iaApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

type Tab = "exercises" | "content" | "lesson_plan";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "exercises", label: "Exercícios", icon: BookOpen },
  { id: "content", label: "Conteúdo", icon: FileText },
  { id: "lesson_plan", label: "Plano de aula", icon: MessageSquare },
];

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

const exerciseTypes = [
  { value: "multiple_choice", label: "Múltipla escolha" },
  { value: "fill_blank", label: "Preencher lacuna" },
  { value: "essay", label: "Redação" },
  { value: "translation", label: "Tradução" },
];

const contentTypes = [
  { value: "vocabulary", label: "Lista de vocabulário" },
  { value: "grammar", label: "Explicação gramatical" },
  { value: "dialogue", label: "Diálogo" },
  { value: "reading", label: "Texto para leitura" },
  { value: "tips", label: "Dicas de pronúncia" },
];

export default function IaPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState<Tab>("exercises");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [exerciseForm, setExerciseForm] = useState({ topic: "", level: "B1", type: "multiple_choice", qty: "5" });
  const [contentForm, setContentForm] = useState({ topic: "", level: "B1", type: "vocabulary" });
  const [planForm, setPlanForm] = useState({ topic: "", level: "B1", duration: "60" });

  if (!isAuthenticated || user?.role !== "admin") { router.push("/auth/login"); return null; }

  const handleGenerate = async () => {
    setError("");
    setResult("");
    setIsLoading(true);
    try {
      let res;
      if (tab === "exercises") {
        res = await iaApi.generateExercises(exerciseForm.topic, exerciseForm.level, exerciseForm.type, Number(exerciseForm.qty));
      } else if (tab === "content") {
        res = await adminApi.generateContent(contentForm.topic, contentForm.type, contentForm.level);
      } else {
        res = await adminApi.generateLessonPlan(planForm.topic, planForm.level, Number(planForm.duration));
      }
      const data = res.data;
      setResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch {
      setError("Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = () => {
    if (tab === "exercises") return exerciseForm.topic.trim().length > 2;
    if (tab === "content") return contentForm.topic.trim().length > 2;
    return planForm.topic.trim().length > 2;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Gerar conteúdo com IA</h1>
          <p className="text-gray-500 mt-1">Use a IA para criar exercícios, materiais e planos de aula</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-xl bg-gray-100 p-1 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setResult(""); setError(""); }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Formulário */}
          <div className="card lg:col-span-2 h-fit">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {tab === "exercises" ? "Gerar exercícios" : tab === "content" ? "Gerar conteúdo" : "Plano de aula"}
            </h2>

            <div className="space-y-4">
              {tab === "exercises" && (
                <>
                  <div>
                    <label className="label">Tópico *</label>
                    <input className="input" placeholder="Ex: Present Perfect, Modal Verbs..." value={exerciseForm.topic} onChange={(e) => setExerciseForm((f) => ({ ...f, topic: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Nível</label>
                    <select className="input" value={exerciseForm.level} onChange={(e) => setExerciseForm((f) => ({ ...f, level: e.target.value }))}>
                      {levels.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tipo de exercício</label>
                    <select className="input" value={exerciseForm.type} onChange={(e) => setExerciseForm((f) => ({ ...f, type: e.target.value }))}>
                      {exerciseTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quantidade</label>
                    <select className="input" value={exerciseForm.qty} onChange={(e) => setExerciseForm((f) => ({ ...f, qty: e.target.value }))}>
                      {["3", "5", "8", "10"].map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                </>
              )}

              {tab === "content" && (
                <>
                  <div>
                    <label className="label">Tópico *</label>
                    <input className="input" placeholder="Ex: Jobs and occupations, Travel phrases..." value={contentForm.topic} onChange={(e) => setContentForm((f) => ({ ...f, topic: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Nível</label>
                    <select className="input" value={contentForm.level} onChange={(e) => setContentForm((f) => ({ ...f, level: e.target.value }))}>
                      {levels.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tipo de conteúdo</label>
                    <select className="input" value={contentForm.type} onChange={(e) => setContentForm((f) => ({ ...f, type: e.target.value }))}>
                      {contentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              {tab === "lesson_plan" && (
                <>
                  <div>
                    <label className="label">Tópico da aula *</label>
                    <input className="input" placeholder="Ex: Conditionals, Job Interview English..." value={planForm.topic} onChange={(e) => setPlanForm((f) => ({ ...f, topic: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Nível dos alunos</label>
                    <select className="input" value={planForm.level} onChange={(e) => setPlanForm((f) => ({ ...f, level: e.target.value }))}>
                      {levels.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Duração (minutos)</label>
                    <select className="input" value={planForm.duration} onChange={(e) => setPlanForm((f) => ({ ...f, duration: e.target.value }))}>
                      {["30", "45", "60", "90", "120"].map((d) => <option key={d}>{d} min</option>)}
                    </select>
                  </div>
                </>
              )}

              <button onClick={handleGenerate} disabled={!canGenerate() || isLoading} className="btn-primary w-full">
                {isLoading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Gerar</>
                )}
              </button>
            </div>
          </div>

          {/* Resultado */}
          <div className="lg:col-span-3">
            {error && (
              <div className="card border-red-200 bg-red-50 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="card text-center py-16">
                <Sparkles className="mx-auto h-10 w-10 text-purple-400 mb-3 animate-pulse" />
                <p className="text-gray-500">A IA está gerando o conteúdo...</p>
                <p className="text-xs text-gray-400 mt-1">Isso pode levar alguns segundos</p>
              </div>
            )}

            {!isLoading && result && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Conteúdo gerado</h3>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                    <button onClick={() => setResult("")} className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto font-sans">
                  {result}
                </pre>
              </div>
            )}

            {!isLoading && !result && !error && (
              <div className="card text-center py-16 border-dashed">
                <Sparkles className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400">Preencha o formulário e clique em Gerar</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
