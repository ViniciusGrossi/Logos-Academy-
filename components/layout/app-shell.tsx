"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, CalendarDays, ChevronRight, CircleUserRound, ClipboardCheck, FolderKanban, Gauge, Home, LogOut, Menu, Moon, ShieldCheck, Sun, UserRound, UsersRound, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { MeProfile } from "@/specs/api.contracts";
import { CinematicPage } from "@/components/academy";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveApi } from "@/components/prototype/live-api";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";

const studentNav = [
  { href: "/", label: "Início", icon: Home },
  { href: "/atividade", label: "Atividade", icon: ClipboardCheck },
  { href: "/jornada", label: "Jornada", icon: Gauge },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/atlas", label: "Atlas", icon: BookOpenText },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

const adminNav = [
  { href: "/admin", label: "Visão geral", icon: Gauge },
  { href: "/admin/alunos", label: "Alunos", icon: UsersRound },
  { href: "/admin/turmas", label: "Turmas", icon: CalendarDays },
  { href: "/admin/revisoes", label: "Revisões", icon: ClipboardCheck },
  { href: "/admin/reposicoes", label: "Reposições", icon: Wrench },
] as const;

const allNav = [...studentNav, ...adminNav];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { data: profile } = useLiveApi<MeProfile>("/api/me");
  const adminContext = pathname.startsWith("/admin");
  const navGroups = [
    { label: "Meu espaço", items: studentNav },
    { label: "Gestão", items: adminNav },
  ];
  const current = [...allNav]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))?.label ?? "Início";

  useEffect(() => {
    const stored = window.localStorage.getItem("academy-theme");
    const nextDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("academy-theme", next ? "dark" : "light");
  }

  async function signOut() {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      await fetch("/api/demo/session", { method: "DELETE" });
    } else {
      await createSupabaseBrowserClient().auth.signOut();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="academy-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <aside className={`academy-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
        <div className="sidebar-head">
          <Link href="/" className="brand-link" aria-label="Logos Academy, início">
            <Image src="/brand/logos-academy-symbol-dark.png" alt="" width={52} height={52} priority />
            <span className="brand-wordmark"><strong>Logos</strong><small>Academy</small></span>
          </Link>
          <button type="button" className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Fechar navegação"><X /></button>
        </div>
        <div className="sidebar-thesis">
          <span>{adminContext ? "Operação · ao vivo" : "Explorer · ciclo atual"}</span>
          <strong>{adminContext ? "Enxergue o risco antes que ele vire atraso." : "Construa algo que você consiga explicar."}</strong>
        </div>
        <nav className="side-nav">
          {navGroups.map(({ label: groupLabel, items }) => <div key={groupLabel} className="side-nav__group">
            <span className="side-nav__label">{groupLabel}</span>
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
              return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                <Icon aria-hidden="true" /><span>{label}</span><ChevronRight className="nav-arrow" aria-hidden="true" />
              </Link>;
            })}
          </div>)}
        </nav>
        <div className="side-status"><ShieldCheck /><span><strong>Apoio às aulas presenciais</strong><small>Progresso, evidências e feedback em um só lugar</small></span></div>
      </aside>
      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <div className="academy-workspace">
        <header className="topbar">
          <button type="button" className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir navegação" aria-expanded={menuOpen}><Menu /></button>
          <div className="breadcrumb"><span>Logos Academy</span><ChevronRight aria-hidden="true" /><strong>{current}</strong></div>
          <div className="top-actions">
            {profile?.role === "admin" && <Link className="role-switch" href={adminContext ? "/" : "/admin"}>{adminContext ? "Ver como aluno" : "Abrir gestão"}</Link>}
            <Tooltip>
              <TooltipTrigger asChild><button type="button" className="icon-button" onClick={toggleTheme} aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}>{dark ? <Sun /> : <Moon />}</button></TooltipTrigger>
              <TooltipContent side="bottom">{dark ? "Usar tema claro" : "Usar tema escuro"}</TooltipContent>
            </Tooltip>
            <Link className="avatar" href="/perfil" aria-label={profile ? `Abrir perfil de ${profile.displayName}` : "Abrir perfil"}><CircleUserRound /></Link>
            {profile && <Tooltip><TooltipTrigger asChild><button type="button" className="icon-button" onClick={() => void signOut()} aria-label="Sair da plataforma"><LogOut /></button></TooltipTrigger><TooltipContent side="bottom">Sair</TooltipContent></Tooltip>}
          </div>
        </header>
        <main id="main-content" className="page-frame" tabIndex={-1}><CinematicPage>{children}</CinematicPage></main>
      </div>
    </div>
  );
}
