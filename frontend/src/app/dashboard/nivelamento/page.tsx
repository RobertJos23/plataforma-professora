"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { progressApi } from "@/lib/api";
import { DashboardNav } from "@/components/DashboardNav";

const questions = [
  {
    id: 1,
    question: 'Choose the correct option: "She ___ English every day."',
    options: ["speak", "speaks", "speaking", "spoken"],
    correct: "speaks",
  },
  {
    id: 2,
    question: 'What ___ you do last weekend?',
    options: ["do", "did", "does", "are"],
    correct: "did",
  },
  {
    id: 3,
    question: 'She ___ English for three years now.',
    options: ["is learning", "learns", "has been learning", "was learning"],
    correct: "has been learning",
  },
  {
    id: 4,
    question: 'If I ___ more money, I would travel the world.',
    options: ["have", "had", "has", "would have"],
    correct: "had",
  },
  {
    id: 5,
    question: 'The meeting has been ___ to next week.',
    options: ["postpone", "postponing", "postponed", "postpones"],
    correct: "postponed",
  },
  {
    id: 6,
    question: 'She insisted that he ___ the rules carefully.',
    options: ["follows", "following", "follow", "followed"],
    correct: "follow",
  },
  {
    id: 7,
    question: 'By the time we arrived, they ___ already.',
    options: ["left", "have left", "had left", "were leaving"],
    correct: "had left",
  },
  {
    id: 8,
    question: 'Choose the most formal option:',
    options: [
      "Can you help me?",
      "Gimme a hand.",
      "I need help now.",
      "Would you be able to assist me?",
    ],
    correct: "Would you be able to assist me?",
  },
  {
    id: 9,
    question: 'His argument was ___: nobody could find a single flaw.',
    options: ["irresponsible", "irrefutable", "irrelevant", "irrational"],
    correct: "irrefutable",
  },
  {
    id: 10,
    question: 'The legislation was ___ in order to address the new economic challenges.',
    options: ["amended", "amended to", "amending", "amendment"],
    correct: "amended",
  },
];

export default function NivelamentoPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ level: string; score: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const q = questions[current];
  const selected = answers[q.id];
  const isLast = current === questions.length - 1;
  const progress = ((current + 1) / questions.length) * 100;

  const handleSelect = (opt: string) => {
    setAnswers((a) => ({ ...a, [q.id]: opt }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  };

  const handlePrev = () => {
    if (current > 0) setCurrent((c) => c - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const payload = questions.map((q) => ({
      question_id: q.id,
      selected: answers[q.id] || "",
    }));
    try {
      const { data } = await progressApi.placementTest(payload);
      setResult({ level: data.level, score: data.score });
    } catch {
      const correct = questions.filter((q) => answers[q.id] === q.correct).length;
      const score = Math.round((correct / questions.length) * 100);
      const level =
        score < 30 ? "A1" :
        score < 50 ? "A2" :
        score < 65 ? "B1" :
        score < 80 ? "B2" : "C1";
      setResult({ level, score });
    } finally {
      setIsSubmitting(false);
    }
  };

  const levelColors: Record<string, string> = {
    A1: "text-gray-600 bg-gray-100",
    A2: "text-blue-600 bg-blue-100",
    B1: "text-green-600 bg-green-100",
    B2: "text-yellow-700 bg-yellow-100",
    C1: "text-orange-600 bg-orange-100",
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="mx-auto max-w-lg px-4 pt-20 pb-12">
          <div className="card text-center mt-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Teste concluído!
            </h1>
            <p className="text-gray-500 mb-6">Você acertou {result.score}% das questões</p>
            <div className={`mx-auto mb-6 inline-flex rounded-2xl px-8 py-4 text-5xl font-bold font-display ${levelColors[result.level] || "text-gray-600 bg-gray-100"}`}>
              {result.level}
            </div>
            <p className="text-gray-600 mb-8">
              Seu nível foi atualizado para <strong>{result.level}</strong>. Continue praticando para evoluir!
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/progresso" className="btn-primary">Ver meu progresso</Link>
              <Link href="/dashboard" className="btn-secondary">Voltar ao início</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="mx-auto max-w-2xl px-4 pt-20 pb-12">
        <div className="mt-4 mb-6">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="font-display text-2xl font-bold text-gray-900">Teste de Nivelamento</h1>
          <p className="text-gray-500 mt-1">10 perguntas para descobrir seu nível CEFR</p>
        </div>

        {/* Barra de progresso */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Questão {current + 1} de {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="card">
          <p className="text-lg font-semibold text-gray-900 mb-6">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  selected === opt
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q${q.id}`}
                  value={opt}
                  checked={selected === opt}
                  onChange={() => handleSelect(opt)}
                  className="accent-primary-500"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-6 gap-3">
            <button
              onClick={handlePrev}
              disabled={current === 0}
              className="btn-ghost py-2.5 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>

            {isLast ? (
              <button
                onClick={handleSubmit}
                disabled={!selected || isSubmitting}
                className="btn-primary py-2.5"
              >
                {isSubmitting
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <CheckCircle className="h-4 w-4" />}
                {isSubmitting ? "Calculando..." : "Ver resultado"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!selected}
                className="btn-primary py-2.5 disabled:opacity-40"
              >
                Próxima <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Indicadores */}
        <div className="flex justify-center gap-1.5 mt-4">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-primary-500" :
                answers[questions[i].id] ? "w-2 bg-primary-300" :
                "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
