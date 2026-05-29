"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send, CheckCircle, Users, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { adminApi } from "@/lib/api";
import { AdminNav } from "@/components/AdminNav";

export default function ComunicadosPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isAuthenticated || user?.role !== "admin") { router.push("/auth/login"); return null; }

  const canSend = title.trim().length > 3 && message.trim().length > 10;

  const handleSend = async () => {
    setError("");
    setIsSending(true);
    try {
      await adminApi.broadcast(title.trim(), message.trim());
      setSuccess(true);
      setShowConfirm(false);
      setTitle("");
      setMessage("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Erro ao enviar comunicado.");
      setShowConfirm(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 pt-20 pb-12">
        <div className="mb-6 mt-4">
          <h1 className="font-display text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-gray-500 mt-1">Envie notificações para todos os alunos ativos</p>
        </div>

        {success && (
          <div className="card border-green-200 bg-green-50 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Comunicado enviado!</p>
              <p className="text-sm text-green-700">Todos os alunos ativos foram notificados.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Formulário */}
          <div className="card lg:col-span-3">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-500" />
              Novo comunicado
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Título *</label>
                <input
                  className="input"
                  placeholder="Ex: Aula cancelada amanhã, Nova turma disponível..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{title.length}/100</p>
              </div>

              <div>
                <label className="label">Mensagem *</label>
                <textarea
                  className="input resize-none"
                  rows={6}
                  placeholder="Escreva o conteúdo do comunicado aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{message.length}/1000</p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-700">
                  Este comunicado será enviado como notificação para <strong>todos os alunos ativos</strong>. Revise antes de enviar.
                </p>
              </div>

              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canSend}
                className="btn-primary w-full"
              >
                <Send className="h-4 w-4" />
                Enviar comunicado
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                Pré-visualização
              </h3>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <Bell className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {title || "Título do comunicado"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {message || "Conteúdo do comunicado aparecerá aqui..."}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Agora mesmo</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Como aparecerá na notificação do aluno
              </p>
            </div>
          </div>
        </div>

        {/* Modal de confirmação */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="text-center mb-4">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                  <Bell className="h-7 w-7 text-orange-500" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900">Confirmar envio</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Enviar este comunicado para todos os alunos ativos?
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-5">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{message}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button onClick={handleSend} disabled={isSending} className="btn-primary flex-1">
                  {isSending ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Enviando...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Enviar agora</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
