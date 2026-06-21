"use client";

import { create } from "zustand";
import type { View } from "./types";

const AUTH_KEY = "ilm-auth";

interface AuthState {
  role: "student" | "scholar";
  isAuthenticated: boolean;
}

function loadAuth(): AuthState {
  if (typeof window === "undefined") {
    return { role: "student", isAuthenticated: false };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      return { role: parsed.role === "scholar" ? "scholar" : "student", isAuthenticated: !!parsed.isAuthenticated };
    }
  } catch {
    /* ignore */
  }
  return { role: "student", isAuthenticated: false };
}

interface IlmState extends AuthState {
  view: View;
  setView: (v: View) => void;
  // auth
  login: (role: "student" | "scholar") => void;
  logout: () => void;
  // (legacy) role switch while authenticated
  setRole: (r: "student" | "scholar") => void;
  // current lesson id when in the Learn player
  activeLessonId: string | null;
  openLesson: (id: string) => void;
  // current course id for tracks browsing
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  // a counter to trigger data refetches after mutations
  refreshKey: number;
  bumpRefresh: () => void;
  // global search command palette
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  // the user's current madhab (populated from /api/me; drives filtering)
  userMadhab: string;
  setUserMadhab: (m: string) => void;
}

const initial = loadAuth();

export const useStore = create<IlmState>((set) => ({
  view: initial.role === "scholar" ? "review" : "dashboard",
  setView: (v) => set({ view: v }),
  // auth
  role: initial.role,
  isAuthenticated: initial.isAuthenticated,
  login: (r) => {
    const state = { role: r, isAuthenticated: true };
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    set({ ...state, view: r === "scholar" ? "review" : "dashboard" });
  },
  logout: () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    set({ isAuthenticated: false, view: "dashboard", activeLessonId: null, activeCourseId: null });
  },
  setRole: (r) => {
    const next = { role: r, isAuthenticated: true };
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    set({ ...next, view: r === "scholar" ? "review" : "dashboard" });
  },
  activeLessonId: null,
  openLesson: (id) => set({ activeLessonId: id, view: "learn" }),
  activeCourseId: null,
  setActiveCourseId: (id) => set({ activeCourseId: id }),
  refreshKey: 0,
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  userMadhab: "shia",
  setUserMadhab: (m) => set({ userMadhab: m }),
}));
