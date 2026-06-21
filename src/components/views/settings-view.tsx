"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Languages,
  Scale,
  ShieldCheck,
  Bell,
  Snowflake,
  Palette,
  RefreshCw,
  Sun,
  Moon,
  Info,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trophy,
  Flame,
  Award,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { ProfileDto } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const LANGUAGES: { value: "en" | "ar" | "ur" | "fa"; label: string; native: string; rtl: boolean }[] = [
  { value: "en", label: "English", native: "English", rtl: false },
  { value: "ar", label: "Arabic", native: "العربية", rtl: true },
  { value: "ur", label: "Urdu", native: "اردو", rtl: true },
  { value: "fa", label: "Persian (Farsi)", native: "فارسی", rtl: true },
];

// ------------------------------------------------------------------
// Small helper — PATCH /api/profile/settings + bumpRefresh + toast.
// ------------------------------------------------------------------
function usePatchSetting() {
  const bumpRefresh = useStore((s) => s.bumpRefresh);
  return React.useCallback(
    async (
      body: Record<string, unknown>,
      successMsg: string,
      opts?: { onOk?: () => void }
    ) => {
      try {
        await apiFetch("/api/profile/settings", {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        bumpRefresh();
        opts?.onOk?.();
        toast.success(successMsg);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
        throw e;
      }
    },
    [bumpRefresh]
  );
}

// ------------------------------------------------------------------
// Section header
// ------------------------------------------------------------------
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="gap-1.5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

// ------------------------------------------------------------------
// Toggle row — used by privacy/notifications
// ------------------------------------------------------------------
function ToggleRow({
  icon,
  title,
  description,
  checked,
  pending,
  onToggle,
  accent = "muted",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  pending: boolean;
  onToggle: (next: boolean) => void;
  accent?: "muted" | "primary" | "amber";
}) {
  const accentBg =
    accent === "primary"
      ? "bg-primary/10 text-primary"
      : accent === "amber"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-muted text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
            accentBg
          )}
        >
          {icon}
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={pending}
        onCheckedChange={onToggle}
        aria-label={title}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// MAIN VIEW
// ------------------------------------------------------------------
export function SettingsView() {
  const { data, loading, error } = useApi<{ profile: ProfileDto }>("/api/me");
  const profile = data?.profile;

  if (loading) return <SettingsSkeleton />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Couldn&apos;t load settings</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!profile) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle>No profile loaded</AlertTitle>
        <AlertDescription>Please reload the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-extrabold tracking-tight ilm-gradient-text">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalise ILM — your language, madhab track, privacy, and reminders.
          Changes save automatically.
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* 1. Language & Script */}
        <LanguageSection profile={profile} />

        {/* 2. Madhab Track */}
        <MadhabSection profile={profile} />

        {/* 3. Privacy */}
        <PrivacySection profile={profile} />

        {/* 4. Notifications */}
        <NotificationsSection profile={profile} />

        {/* 5. Streak & Freeze (read-only) */}
        <StreakFreezeSection profile={profile} />

        {/* 6. Appearance */}
        <AppearanceSection />

        {/* 7. Restart Onboarding (footer) */}
        <OnboardingSection />
      </div>
    </div>
  );
}

// ==================================================================
// 1. Language & Script
// ==================================================================
function LanguageSection({ profile }: { profile: ProfileDto }) {
  const patch = usePatchSetting();
  const [pendingLang, setPendingLang] = React.useState(false);
  const [pendingRtl, setPendingRtl] = React.useState(false);

  const currentLang = (profile.language as "en" | "ar" | "ur" | "fa") || "en";
  const langMeta = LANGUAGES.find((l) => l.value === currentLang) ?? LANGUAGES[0];
  const rtlOverrideOn = profile.rtlOverride === "rtl";

  async function changeLanguage(next: string) {
    if (next === currentLang) return;
    setPendingLang(true);
    try {
      await patch(
        { language: next },
        `Language set to ${LANGUAGES.find((l) => l.value === next)?.label ?? next}.`
      );
    } finally {
      setPendingLang(false);
    }
  }

  async function toggleRtl(next: boolean) {
    setPendingRtl(true);
    try {
      await patch(
        { rtlOverride: next ? "rtl" : null },
        next ? "RTL override enabled." : "RTL set to auto-detect."
      );
    } finally {
      setPendingRtl(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={<Languages className="size-4" />}
        title="Language & Script"
        description="Choose the UI language and override RTL if needed."
      />
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1.5">
            <Label htmlFor="ui-language" className="text-sm font-semibold">
              UI language
            </Label>
            <Select
              value={currentLang}
              onValueChange={changeLanguage}
              disabled={pendingLang}
            >
              <SelectTrigger id="ui-language" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    <span className="flex items-center gap-2">
                      <span>{l.label}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="arabic text-base">{l.native}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="self-end text-xs text-muted-foreground">
            {langMeta.rtl ? (
              <Badge variant="secondary" className="font-medium">
                Auto-detected: RTL
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-medium">
                Auto-detected: LTR
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <ToggleRow
          icon={<Globe className="size-4" />}
          title="RTL override"
          description="Force right-to-left layout regardless of language. RTL is auto-detected from language but can be overridden."
          checked={rtlOverrideOn}
          pending={pendingRtl}
          onToggle={toggleRtl}
          accent="primary"
        />
      </CardContent>
    </Card>
  );
}

// ==================================================================
// 2. Madhab Track
// ==================================================================
function MadhabSection({ profile }: { profile: ProfileDto }) {
  const patch = usePatchSetting();
  const setUserMadhab = useStore((s) => s.setUserMadhab);
  const [pending, setPending] = React.useState(false);

  const current =
    profile.madhab === "sunni" ? "sunni" : "shia";

  async function choose(next: "shia" | "sunni") {
    if (next === current) return;
    setPending(true);
    try {
      await patch(
        { madhab: next },
        `Madhab track set to ${next === "shia" ? "Shia" : "Sunni"}.`,
        { onOk: () => setUserMadhab(next) }
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={<Scale className="size-4" />}
        title="Madhab Track"
        description="Choose which school of thought's content to surface."
      />
      <CardContent className="space-y-4">
        <RadioGroup
          value={current}
          onValueChange={(v) => choose(v as "shia" | "sunni")}
          disabled={pending}
          className="gap-2"
        >
          <MadhabOption
            value="shia"
            checked={current === "shia"}
            title="Shia (primary track)"
            description="Primary content track — Twelver Imami scholarship (al-Kāfī, Nahj al-Balāgha, Biḥār al-Anwār)."
            accent="emerald"
          />
          <MadhabOption
            value="sunni"
            checked={current === "sunni"}
            title="Sunni (secondary track)"
            description="Secondary content track — Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim, and related canonical sources."
            accent="sky"
          />
        </RadioGroup>

        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Changing this re-filters the Tracks, Courses, and Library shown
            throughout the app. <span className="font-semibold">Shia and Sunni content are never merged.</span>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function MadhabOption({
  value,
  checked,
  title,
  description,
  accent,
}: {
  value: string;
  checked: boolean;
  title: string;
  description: string;
  accent: "emerald" | "sky";
}) {
  const ring =
    accent === "emerald"
      ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30"
      : "border-sky-500/60 bg-sky-500/5 ring-1 ring-sky-500/30";
  const dot =
    accent === "emerald"
      ? "bg-emerald-500 text-emerald-50"
      : "bg-sky-500 text-sky-50";
  return (
    <Label
      htmlFor={`madhab-${value}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all hover:bg-accent/40",
        checked ? ring : "bg-card"
      )}
    >
      <RadioGroupItem
        id={`madhab-${value}`}
        value={value}
        className={cn(
          "mt-1",
          accent === "emerald"
            ? "data-[state=checked]:border-emerald-500 [&_svg]:fill-emerald-500"
            : "data-[state=checked]:border-sky-500 [&_svg]:fill-sky-500"
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{title}</span>
          {checked && (
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full",
                dot
              )}
            >
              <CheckCircle2 className="size-3.5" />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </Label>
  );
}

// ==================================================================
// 3. Privacy
// ==================================================================
function PrivacySection({ profile }: { profile: ProfileDto }) {
  const patch = usePatchSetting();
  const [pubPending, setPubPending] = React.useState(false);
  const [lbPending, setLbPending] = React.useState(false);

  async function togglePublic(next: boolean) {
    setPubPending(true);
    try {
      await patch(
        { publicProfile: next },
        next ? "Public profile enabled." : "Profile set to private."
      );
    } finally {
      setPubPending(false);
    }
  }

  async function toggleLeaderboard(next: boolean) {
    setLbPending(true);
    try {
      await patch(
        { leaderboardOptIn: next },
        next
          ? "You'll now appear on the leaderboard."
          : "You've been removed from the leaderboard."
      );
    } finally {
      setLbPending(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={<ShieldCheck className="size-4" />}
        title="Privacy"
        description="Control who can see your profile and progress."
      />
      <CardContent className="space-y-1">
        <ToggleRow
          icon={profile.publicProfile ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          title="Public profile"
          description="Allow other learners to view your profile, level, and recent activity."
          checked={profile.publicProfile}
          pending={pubPending}
          onToggle={togglePublic}
        />
        <Separator />
        <ToggleRow
          icon={<Trophy className="size-4" />}
          title="Appear on leaderboard"
          description="Be ranked against other learners in the global leaderboard."
          checked={profile.leaderboardOptIn}
          pending={lbPending}
          onToggle={toggleLeaderboard}
          accent="amber"
        />
        <Alert className="mt-3">
          <Info className="size-4" />
          <AlertDescription>
            Leaderboard participation is{" "}
            <span className="font-semibold">opt-in and off by default</span>. We
            respect learners who prefer private study.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ==================================================================
// 4. Notifications
// ==================================================================
function NotificationsSection({ profile }: { profile: ProfileDto }) {
  const patch = usePatchSetting();
  const [reminderPending, setReminderPending] = React.useState(false);
  const [timePending, setTimePending] = React.useState(false);
  const [streakAlertPending, setStreakAlertPending] = React.useState(false);

  const [reminderTime, setReminderTime] = React.useState(
    profile.dailyReminderTime ?? "08:00"
  );
  React.useEffect(() => {
    if (profile.dailyReminderTime) setReminderTime(profile.dailyReminderTime);
  }, [profile.dailyReminderTime]);

  async function toggleReminder(next: boolean) {
    setReminderPending(true);
    try {
      await patch(
        { dailyReminderEnabled: next },
        next ? "Daily reminder enabled." : "Daily reminder disabled."
      );
    } finally {
      setReminderPending(false);
    }
  }

  async function changeTime(next: string) {
    setReminderTime(next);
    setTimePending(true);
    try {
      await patch(
        { dailyReminderTime: next },
        `Reminder time set to ${next}.`
      );
    } finally {
      setTimePending(false);
    }
  }

  async function toggleStreakAlert(next: boolean) {
    setStreakAlertPending(true);
    try {
      await patch(
        { streakAlertsEnabled: next },
        next ? "Streak-at-risk alerts enabled." : "Streak alerts disabled."
      );
    } finally {
      setStreakAlertPending(false);
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={<Bell className="size-4" />}
        title="Notifications"
        description="Gentle reminders that support — never exploit — your habit."
      />
      <CardContent className="space-y-1">
        <ToggleRow
          icon={<Bell className="size-4" />}
          title="Daily reminder"
          description="Receive a daily nudge to keep your streak alive."
          checked={profile.dailyReminderEnabled}
          pending={reminderPending}
          onToggle={toggleReminder}
        />

        {profile.dailyReminderEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 py-3 pl-12">
              <div>
                <div className="text-sm font-semibold">Reminder time</div>
                <div className="text-xs text-muted-foreground">
                  When would you like to be reminded each day?
                </div>
              </div>
              <div className="flex items-center gap-2">
                {timePending && (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value !== (profile.dailyReminderTime ?? "08:00")) {
                      changeTime(e.target.value);
                    }
                  }}
                  className="w-32"
                  disabled={timePending}
                />
              </div>
            </div>
          </motion.div>
        )}

        <Separator />

        <ToggleRow
          icon={<Flame className="size-4" />}
          title="Streak-at-risk alert"
          description="Get warned if your streak is about to lapse at end of day."
          checked={profile.streakAlertsEnabled}
          pending={streakAlertPending}
          onToggle={toggleStreakAlert}
          accent="amber"
        />
      </CardContent>
    </Card>
  );
}

// ==================================================================
// 5. Streak & Freeze (read-only)
// ==================================================================
function StreakFreezeSection({ profile }: { profile: ProfileDto }) {
  const stats = [
    {
      icon: <Snowflake className="size-4" />,
      label: "Freeze tokens remaining",
      value: `${profile.streakFreezeCount}`,
      hint: "Refilled monthly",
      accent: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    },
    {
      icon: <Flame className="size-4" />,
      label: "Current streak",
      value: `${profile.streakCount} day${profile.streakCount === 1 ? "" : "s"}`,
      hint: "Keep it going",
      accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    {
      icon: <Award className="size-4" />,
      label: "Longest streak",
      value: `${profile.longestStreak} day${profile.longestStreak === 1 ? "" : "s"}`,
      hint: "Personal record",
      accent: "text-primary bg-primary/10",
    },
  ];

  return (
    <Card className="border-dashed bg-muted/30">
      <SectionHeader
        icon={<Snowflake className="size-4" />}
        title="Streak & Freeze"
        description="How your streak is protected — read-only overview."
      />
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-card p-4"
            >
              <div
                className={cn(
                  "mb-2 inline-flex size-8 items-center justify-center rounded-lg",
                  s.accent
                )}
              >
                {s.icon}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-xl font-extrabold tabular-nums">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {s.hint}
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            You receive <span className="font-semibold">3 freeze tokens per month</span>.
            A freeze automatically preserves your streak for one missed day. This is
            designed to be <span className="font-semibold">humane, not predatory</span> —
            we don&apos;t shame missed days.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// ==================================================================
// 6. Appearance
// ==================================================================
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  return (
    <Card>
      <SectionHeader
        icon={<Palette className="size-4" />}
        title="Appearance"
        description="Light or dark — your preference is stored locally."
      />
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={!mounted ? "outline" : !isDark ? "default" : "outline"}
            className="h-auto justify-start gap-3 py-4"
            onClick={() => setTheme("light")}
            aria-pressed={!isDark}
          >
            <Sun className="size-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">Light</div>
              <div className="text-[11px] opacity-80">Bright scholarly palette</div>
            </div>
          </Button>
          <Button
            variant={!mounted ? "outline" : isDark ? "default" : "outline"}
            className="h-auto justify-start gap-3 py-4"
            onClick={() => setTheme("dark")}
            aria-pressed={isDark}
          >
            <Moon className="size-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">Dark</div>
              <div className="text-[11px] opacity-80">Easy on the eyes at night</div>
            </div>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Choose your preferred theme. This is stored locally and applies only on
          this device.
        </p>
      </CardContent>
    </Card>
  );
}

// ==================================================================
// 7. Restart Onboarding
// ==================================================================
function OnboardingSection() {
  const patch = usePatchSetting();
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function restart() {
    setPending(true);
    try {
      await patch(
        { onboarded: false },
        "Onboarding restarted — redirecting…"
      );
      setOpen(false);
    } catch {
      /* toast already shown */
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <RefreshCw className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base">Onboarding</CardTitle>
            <CardDescription className="text-xs">
              Walk through the welcome flow again.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Re-run the onboarding wizard to re-pick your madhab track, language, and
          interests. Your progress and XP are kept.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <RefreshCw className="size-4" />
              Restart onboarding
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restart onboarding?</AlertDialogTitle>
              <AlertDialogDescription>
                This will take you back to the welcome flow. You can reselect your
                madhab track, language, and interests. Your XP, streak, badges, and
                course progress are preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  restart();
                }}
                disabled={pending}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Yes, restart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

// ==================================================================
// Skeleton
// ==================================================================
function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader className="gap-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
