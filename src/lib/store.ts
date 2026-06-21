"use client";

import { create } from "zustand";
import type { View } from "./types";

interface IlmState {
  view: View;
  setView: (v: View) => void;
  // demo role switch (student | scholar) — drives the x-ilm-user header
  role: "student" | "scholar";
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

export const useStore = create<IlmState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),
  role: "student",
  setRole: (r) => set({ role: r, view: r === "scholar" ? "review" : "dashboard" }),
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
