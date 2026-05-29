"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bell, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { DarkModeToggle } from "./DarkModeToggle";

const navLinks = [
  { href: "/dashboard", label: "Início", exact: true },
  { href: "/dashboard/aulas", label: "Aulas" },
  { href: "/dashboard/materiais", label: "Materiais" },
  { href: "/dashboard/exercicios", label: "Exercícios" },
  { href: "/dashboard/progresso", label: "Progresso" },
  { href: "/dashboard/ia-chat", label: "Lily IA" },
];

interface Props {
  notificationCount?: number;
}

export function DashboardNav({ notificationCount = 0 }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label, exact }) => (
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

        <div className="flex items-center gap-1.5">
          <button className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
                {notificationCount}
              </span>
            )}
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 sm:block">
            {user?.name?.split(" ")[0]}
          </span>
          <DarkModeToggle />
          <button
            onClick={logout}
            className="rounded-lg p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
