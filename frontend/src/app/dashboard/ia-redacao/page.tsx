"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, FileText, RotateCcw, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { iaApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

interface CorrectionResult {
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  coherence_score: number;
  corrected_text: string;
  feedback: string;
  suggestions: string[];
}

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function IaRedacaoPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [text, setText] = useState("");
  const [level, setLevel] = useState(user?.level || "B1");
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) { router.push("/auth/login"); return null; }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = wordCount >= 30 && !isLoading;

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { data } = await iaApi.correctEssay(text, level);
      setResult(data);
    } catch {
      setError("Não foi possível corrigir o texto. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setText("");
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600" :
    score >= 60 ? "text-yellow-600" :
    "text-red-600";

  const scoreBar = (score: number) =>
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="mx-auto max-w-3xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Correção de Redação</h1>
          <p className="text-gray-500 mt-1">A Lily corrige sua redação com feedback detalhado</p>
        </div>

        {!result ? (
          <div className="card">
            <div className="mb-4">
              <label className="label">Seu nível</label>
              <div className="flex flex-wrap gap-2">
                {levels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`rounded-xl border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                      level === l
                        ? "border-primary-500 bg-primary-50 text-primary-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">
                Sua redação <span className="text-gray-400 font-normal">(mínimo 30 palavras)</span>
              </label>
              <textarea
                className="input min-h-[280px] resize-y leading-relaxed"
                placeholder="Write your text here in English..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right mt-1">{wordCount} palavras</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  A Lily está corrigindo...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Corrigir com IA
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score geral */}
            <div className="card text-center">
              <p className="text-sm text-gray-500 mb-2">Pontuação geral</p>
              <p className={`text-5xl font-bold font-display mb-1 ${scoreColor(result.overall_score)}`}>
                {result.overall_score}
              </p>
              <p className="text-gray-400 text-sm">/100</p>
            </div>

            {/* Notas por critério */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Avaliação por critério</h2>
              {[
                { label: "Gramática", score: result.grammar_score },
                { label: "Vocabulário", score: result.vocabulary_score },
                { label: "Coerência", score: result.coherence_score },
              ].map((item) => (
                <div key={item.label} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={`font-bold ${scoreColor(item.score)}`}>{item.score}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBar(item.score)}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🤖 Feedback da Lily
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
            </div>

            {/* Sugestões */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3">Pontos de melhoria</h2>
                <ul className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-orange-100 text-center text-xs font-bold text-orange-600 leading-5">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Texto corrigido */}
            {result.corrected_text && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Texto com correções
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-green-50 rounded-xl p-4">
                  {result.corrected_text}
                </p>
              </div>
            )}

            <button onClick={handleReset} className="btn-secondary w-full">
              <RotateCcw className="h-4 w-4" />
              Corrigir outro texto
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
