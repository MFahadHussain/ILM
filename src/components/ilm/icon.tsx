"use client";

import * as React from "react";
import {
  Footprints, Flame, Brain, ShieldCheck, Droplets, Target, BookMarked,
  Sparkles, Award, Sun, Moon, Scale, BookOpen, ScrollText, Medal,
  Trophy, Star, Crown, Gem, Bookmark, HelpCircle, type LucideProps,
} from "lucide-react";

// Curated icon map for badge/medal/track icons stored as strings in the DB.
const MAP: Record<string, React.ComponentType<LucideProps>> = {
  Footprints, Flame, Brain, ShieldCheck, Droplets, Target, BookMarked,
  Sparkles, Award, Sun, Moon, Scale, BookOpen, ScrollText, Medal,
  Trophy, Star, Crown, Gem, Bookmark,
};

export function IlmIcon({
  name,
  className,
  size,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Cmp = MAP[name] ?? HelpCircle;
  return <Cmp className={className} size={size} />;
}
