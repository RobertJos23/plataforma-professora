"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { DarkModeToggle } from "./DarkModeToggle";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", exact: true },
  { href: "/admin/alunos", label: "Alunos" },
  { href: "/admin/aulas", label: "Aulas" },
  { href: "/admin/materiais", label: "Materiais" },
  { href: "/admin/exercicios", label: "Exercícios" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/ia", label: "IA" },
  { href: "/admin/comunicados", label: "Comunicados" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-0.5">
            {adminLinks.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(href, exact)
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
            {user?.name?.split(" ")[0]}
          </span>
          <span className="badge bg-primary-100 text-primary-600 text-xs dark:bg-primary-900/40 dark:text-primary-400">Admin</span>
          <DarkModeToggle />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
