"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { DarkModeToggle } from "@/components/DarkModeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, isAuthenticated, clearError } = useAuthStore();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (form.password !== form.confirmPassword) {
      return;
    }

    try {
      await register({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
    } catch {
      // Erro tratado no store
    }
  };

  const passwordsMatch = form.password === form.confirmPassword || form.confirmPassword === "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2"><DarkModeToggle /></div>
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">
              Professora<span className="text-primary-500"> English</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Criar conta grátis</h1>
          <p className="mt-2 text-gray-500">Comece com uma aula experimental gratuita</p>
        </div>

        {/* Form */}
        <div className="card shadow-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="full_name">Nome completo</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="input"
                placeholder="Seu nome completo"
                value={form.full_name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  className="input pr-10"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirmPassword">Confirmar senha</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPass ? "text" : "password"}
                  className={`input pr-10 ${
                    !passwordsMatch ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
                  }`}
                  placeholder="Repita a senha"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {form.confirmPassword && passwordsMatch && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {!passwordsMatch && (
                <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta grátis"
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              Ao criar conta, você concorda com nossos{" "}
              <Link href="/termos" className="underline hover:text-primary-500">
                Termos de Uso
              </Link>
              {" "}e{" "}
              <Link href="/privacidade" className="underline hover:text-primary-500">
                Política de Privacidade
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/auth/login" className="font-medium text-primary-500 hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
