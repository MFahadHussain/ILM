"use client";

import { create } from "zustand";
import type { View } from "./types";

const AUTH_KEY = "ilm-auth";

interface PersistedAuth {
  userId: string | null;
  role: "student" | "scholar";
  isAuthenticated: boolean;
}

function loadAuth(): PersistedAuth {
  if (typeof window === "undefined") {
    return { userId: null, role: "student", isAuthenticated: false };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedAuth;
      return {
        userId: parsed.userId ?? null,
        role: parsed.role === "scholar" ? "scholar" : "student",
        isAuthenticated: !!parsed.isAuthenticated,
      };
    }
  } catch {
    /* ignore */
  }
  return { userId: null, role: "student", isAuthenticated: false };
}

interface IlmState extends PersistedAuth {
  view: View;
  setView: (v: View) => void;
  // auth — login now takes a real userId + role
  login: (userId: string, role: "student" | "scholar") => void;
  logout: () => void;
  // role switch (keeps the same userId, just swaps the view set)
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

function persist(state: PersistedAuth) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const initial = loadAuth();

export const useStore = create<IlmState>((set) => ({
  view: initial.role === "scholar" ? "review" : "dashboard",
  setView: (v) => set({ view: v }),
  // auth
  userId: initial.userId,
  role: initial.role,
  isAuthenticated: initial.isAuthenticated,
  login: (uid, r) => {
    const state: PersistedAuth = { userId: uid, role: r, isAuthenticated: true };
    persist(state);
    set({ ...state, view: r === "scholar" ? "review" : "dashboard" });
  },
  logout: () => {
    const state: PersistedAuth = { userId: null, role: "student", isAuthenticated: false };
    persist(state);
    set({ ...state, view: "dashboard", activeLessonId: null, activeCourseId: null });
  },
  setRole: (r) => {
    const state: PersistedAuth = {
      userId: useStore.getState().userId,
      role: r,
      isAuthenticated: true,
    };
    persist(state);
    set({ role: r, view: r === "scholar" ? "review" : "dashboard" });
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
