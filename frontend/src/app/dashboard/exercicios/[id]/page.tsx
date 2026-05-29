"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Send, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { exercisesApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

interface ExerciseQuestion {
  question: string;
  options?: string[];
  correct_answer?: string;
}

interface Exercise {
  id: number;
  title: string;
  description?: string;
  type: string;
  level?: string;
  points: number;
  content: ExerciseQuestion | ExerciseQuestion[];
}

interface SubmissionResult {
  status: string;
  score?: number;
  feedback?: string;
  correct_answer?: string;
}

export default function ExercicioPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const id = Number(params.id);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [essayText, setEssayText] = useState("");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    exercisesApi.get(id)
      .then((r) => setExercise(r.data))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, id]);

  const handleSubmit = async () => {
    if (!exercise) return;
    setIsSubmitting(true);
    try {
      const payload =
        exercise.type === "essay"
          ? { text: essayText }
          : exercise.type === "multiple_choice"
          ? { selected: answer["q0"] }
          : { answers: answer };

      const { data } = await exercisesApi.submit(id, payload);
      setResult(data);
    } catch {
      alert("Erro ao enviar resposta.");
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

  if (!exercise) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="mx-auto max-w-3xl px-4 pt-20 pb-12 text-center">
          <p className="text-gray-500 mt-8">Exercício não encontrado.</p>
          <Link href="/dashboard/exercicios" className="btn-secondary mt-4">Voltar</Link>
        </main>
      </div>
    );
  }

  const questions = Array.isArray(exercise.content) ? exercise.content : [exercise.content];
  const isMultipleChoice = exercise.type === "multiple_choice";
  const isEssay = exercise.type === "essay";

  const canSubmit = isEssay
    ? essayText.trim().length > 50
    : Object.keys(answer).length === questions.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="mx-auto max-w-3xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/dashboard/exercicios" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar aos exercícios
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-gray-900">{exercise.title}</h1>
            {exercise.level && (
              <span className="badge bg-blue-100 text-blue-600">{exercise.level}</span>
            )}
            <span className="badge bg-gray-100 text-gray-600">⭐ {exercise.points} pts</span>
          </div>
          {exercise.description && (
            <p className="text-gray-500 mt-2">{exercise.description}</p>
          )}
        </div>

        {result ? (
          <div className="card">
            {result.score !== undefined ? (
              <div className="text-center py-4">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  result.score >= 70 ? "bg-green-100" : "bg-red-100"
                }`}>
                  {result.score >= 70
                    ? <CheckCircle className="h-8 w-8 text-green-500" />
                    : <XCircle className="h-8 w-8 text-red-500" />
                  }
                </div>
                <p className="text-4xl font-bold font-display text-gray-900 mb-2">{result.score}%</p>
                <p className="text-gray-500">
                  {result.score >= 70 ? "Parabéns! Ótimo trabalho." : "Continue praticando!"}
                </p>
                {result.correct_answer && (
                  <div className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-left">
                    <p className="text-sm font-semibold text-green-800">Resposta correta:</p>
                    <p className="text-sm text-green-700 mt-1">{result.correct_answer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <BookOpen className="mx-auto h-12 w-12 text-primary-400 mb-3" />
                <p className="font-semibold text-gray-900">Redação enviada!</p>
                <p className="text-sm text-gray-500 mt-1">A professora vai corrigir em breve.</p>
              </div>
            )}
            {result.feedback && (
              <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-4">
                <p className="text-sm font-semibold text-primary-800">Feedback da IA:</p>
                <p className="text-sm text-primary-700 mt-1 whitespace-pre-wrap">{result.feedback}</p>
              </div>
            )}
            <Link href="/dashboard/exercicios" className="btn-secondary w-full mt-6">
              Ver mais exercícios
            </Link>
          </div>
        ) : (
          <div className="card">
            {isEssay ? (
              <div className="space-y-4">
                <p className="font-semibold text-gray-900">
                  {Array.isArray(exercise.content)
                    ? (exercise.content[0] as ExerciseQuestion).question
                    : (exercise.content as ExerciseQuestion).question}
                </p>
                <textarea
                  className="input min-h-[200px] resize-y"
                  placeholder="Escreva sua redação aqui... (mínimo 50 caracteres)"
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right">{essayText.length} caracteres</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, qi) => (
                  <div key={qi}>
                    <p className="font-semibold text-gray-900 mb-3">
                      {questions.length > 1 ? `${qi + 1}. ` : ""}{q.question}
                    </p>
                    {q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <label
                            key={oi}
                            className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                              answer[`q${qi}`] === opt
                                ? "border-primary-500 bg-primary-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${qi}`}
                              value={opt}
                              checked={answer[`q${qi}`] === opt}
                              onChange={() => setAnswer((a) => ({ ...a, [`q${qi}`]: opt }))}
                              className="accent-primary-500"
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="btn-primary w-full mt-6"
            >
              {isSubmitting
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Send className="h-4 w-4" />}
              {isSubmitting ? "Enviando..." : "Enviar resposta"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
