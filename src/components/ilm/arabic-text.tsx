"use client";

import { cn } from "@/lib/utils";

export function ArabicText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("arabic text-xl md:text-2xl leading-loose", className)}>{children}</p>;
}
