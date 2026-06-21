"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Mail, Lock, ArrowRight, GraduationCap, ShieldCheck,
  BookOpen, Users, Eye, EyeOff, Loader2, Quote,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  {
    role: "student" as const,
    email: "talib@ilm.dev",
    name: "Talib al-Ilm",
    title: "Student",
    desc: "Shia Fiqh & Knowledge tracks — XP, streaks, badges",
    icon: GraduationCap,
    accent: "emerald",
  },
  {
    role: "scholar" as const,
    email: "reviewer@ilm.dev",
    name: "Dr. H. Rizvi",
    title: "Scholar · Reviewer",
    desc: "Review queue, content authoring, audit trail",
    icon: ShieldCheck,
    accent: "amber",
  },
];

export function LoginView() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<"signin" | "register">("signin");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }
    setLoading(true);
    // Demo auth: match against seeded accounts by email prefix.
    setTimeout(() => {
      const lower = email.trim().toLowerCase();
      if (lower.includes("review") || lower.includes("scholar") || lower === "reviewer@ilm.dev") {
        login("scholar");
        toast.success("Welcome back, Dr. Rizvi.");
      } else {
        // default to student for any other email
        login("student");
        toast.success("Welcome to ILM.");
      }
      setLoading(false);
    }, 600);
  }

  function quickLogin(role: "student" | "scholar") {
    setLoading(true);
    setTimeout(() => {
      login(role);
      toast.success(role === "scholar" ? "Welcome back, Dr. Rizvi." : "Welcome to ILM.");
      setLoading(false);
    }, 400);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="ilm-pattern absolute inset-0 opacity-60" aria-hidden />
      <div className="absolute -left-32 top-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
      <div className="absolute -right-32 bottom-0 size-96 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card/80 shadow-2xl backdrop-blur lg:grid-cols-2">
          {/* Left — brand / hero panel */}
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-emerald-700 to-emerald-900 p-10 text-white lg:flex">
            <div className="ilm-pattern absolute inset-0 opacity-20" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Sparkles className="size-7" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight">ILM</div>
                  <div className="text-[11px] font-medium uppercase tracking-widest text-emerald-200">
                    Islamic Studies
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-16"
              >
                <h1 className="text-3xl font-bold leading-tight">
                  Seek knowledge,<br />from verified sources.
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-emerald-100">
                  A gamified Islamic Studies platform built on a source-of-truth library.
                  Every text you study is traceable to a reviewed primary source —
                  Qur&apos;an, Hadith, Tafsir, and Fiqh.
                </p>
              </motion.div>

              <div className="mt-8 space-y-3">
                {[
                  { icon: BookOpen, label: "5 primary source books indexed" },
                  { icon: ShieldCheck, label: "Scholar-reviewed content gate" },
                  { icon: Users, label: "XP, streaks, badges & leaderboards" },
                ].map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-emerald-50"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                      <f.icon className="size-4" />
                    </div>
                    {f.label}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative mt-10 rounded-xl bg-white/10 p-4 backdrop-blur">
              <Quote className="size-5 text-amber-300" />
              <p className="mt-2 font-arabic text-lg leading-loose" dir="rtl">
                طَلَبُ الْعِلْمِ فَرِيضَةٌ فِي كُلِّ حَالٍ
              </p>
              <p className="mt-1 text-xs text-emerald-100">
                &ldquo;Seeking knowledge is an obligation in every circumstance.&rdquo;
                <span className="block text-emerald-300">— Al-Kafi 1:30</span>
              </p>
            </div>
          </div>

          {/* Right — login form */}
          <div className="flex flex-col justify-center p-8 sm:p-10">
            {/* Mobile brand */}
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="text-xl font-extrabold ilm-gradient-text">ILM</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Islamic Studies
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === "signin" ? "Sign in to your account" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Continue your journey of knowledge."
                  : "Begin studying today — it's free."}
              </p>
            </motion.div>

            {/* Quick demo accounts */}
            <div className="mt-6">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick demo access
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      disabled={loading}
                      onClick={() => quickLogin(acc.role)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition hover:border-primary/50 hover:shadow-sm disabled:opacity-50",
                        acc.accent === "emerald" && "hover:border-emerald-500/50",
                        acc.accent === "amber" && "hover:border-amber-500/50"
                      )}
                    >
                      <div className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg text-white",
                        acc.accent === "emerald" ? "bg-emerald-600" : "bg-amber-600"
                      )}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{acc.title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{acc.desc}</div>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                or use email
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Email / password form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => toast.info("Demo mode — any password works.")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border bg-background pl-10 pr-10 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "register" : "signin")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Demo mode — any email & password works. Use the quick-access buttons above to explore as Student or Scholar.
            </p>
          </div>
        </div>
      </div>

      {/* Footer credit */}
      <footer className="relative z-10 px-4 pb-6 text-center">
        <p className="text-xs text-muted-foreground">
          Built by{" "}
          <a
            href="https://fahadai.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Fahad Hussain
          </a>{" "}
          <span className="text-muted-foreground/60">· Developer</span>
        </p>
      </footer>
    </div>
  );
}
