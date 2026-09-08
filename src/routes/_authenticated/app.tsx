import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, BellRing } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Flight Price Notifier" },
      { name: "description", content: "Your saved flight routes and price alerts." },
      { property: "og:title", content: "Your dashboard — Flight Price Notifier" },
      { property: "og:description", content: "Your saved flight routes and price alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Plane className="size-5 text-primary" />
            Flight Price Notifier
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <button
              onClick={signOut}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Your fare watchlist</h1>
        <p className="mt-2 text-muted-foreground">
          This is where your tracked routes and price alerts will live.
        </p>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <BellRing className="mx-auto size-6 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">No routes tracked yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Route tracking and price alerts are coming next. Your account is ready and waiting.
          </p>
        </div>
      </main>
    </div>
  );
}
