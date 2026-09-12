import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Plane, BellRing, LineChart } from "lucide-react";
import { usePageMeta } from "@/lib/use-page-meta";

export default function Index() {
  usePageMeta({
    title: "Flight Price Notifier — Get alerted when fares drop",
    description:
      "Track flight routes and get an alert the moment prices drop. Set your target fare once and let Flight Price Notifier watch the rest.",
    ogDescription: "Track flight routes and get an alert the moment prices drop.",
  });

  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_35%,transparent),transparent)]" />
      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <Plane className="size-5 text-primary" />
            Flight Price Notifier
          </span>
          <Link
            to={signedIn ? "/app" : "/auth"}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            {signedIn ? "Open dashboard" : "Sign in / 登入"}
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Fare tracking, on autopilot
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            設定航線與目標價，機票降價就通知你
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Set a route and a target price — we email you when the fare drops.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              to="/auth?mode=signin"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
            >
              I already have an account
            </Link>
          </div>

          <section className="mt-24 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: LineChart,
                title: "盯緊熱門航線 (Always-on route watching)",
                body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。",
              },
              {
                icon: BellRing,
                title: "達標自動通知 (Target-price email alerts)",
                body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。",
              },
              {
                icon: Plane,
                title: "隨時取消 (Cancel anytime)",
                body: "月訂閱制，不想用隨時停，沒有綁約。",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="size-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </section>
        </main>

        <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-sm text-muted-foreground">
          © 2026 Flight Price Notifier
        </footer>
      </div>
    </div>
  );
}
