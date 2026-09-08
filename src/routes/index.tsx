import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plane, BellRing, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flight Price Notifier — Get alerted when fares drop" },
      {
        name: "description",
        content:
          "Track flight routes and get an alert the moment prices drop. Set your target fare once and let Flight Price Notifier watch the rest.",
      },
      { property: "og:title", content: "Flight Price Notifier — Get alerted when fares drop" },
      {
        property: "og:description",
        content: "Track flight routes and get an alert the moment prices drop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
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
            {signedIn ? "Open dashboard" : "Sign in"}
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Fare tracking, on autopilot
          </p>
          <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Never overpay for a flight again.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Pick a route, name your price, and get notified the moment the fare drops below it.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create free account
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent"
            >
              I already have an account
            </Link>
          </div>

          <section className="mt-24 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: LineChart,
                title: "Watch any route",
                body: "Save the trips you care about and keep an eye on their fares over time.",
              },
              {
                icon: BellRing,
                title: "Drop alerts",
                body: "Set a target price and hear from us only when it's actually worth booking.",
              },
              {
                icon: Plane,
                title: "Book with confidence",
                body: "See where a fare sits against its recent range before you commit.",
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
      </div>
    </div>
  );
}
