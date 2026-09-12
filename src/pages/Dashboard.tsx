import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, BellRing } from "lucide-react";
import { usePageMeta } from "@/lib/use-page-meta";
import { useAuthUser } from "@/components/RequireAuth";
import { PLANS, subscribe, type PlanName } from "@/lib/flight-api";

type CardStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "subscribed"; target: number }
  | { kind: "error"; message: string };

export default function Dashboard() {
  usePageMeta({
    title: "Your dashboard — Flight Price Notifier",
    description: "Your saved flight routes and price alerts.",
    robots: "noindex",
  });

  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Per-plan target-price input + submission status.
  const [targets, setTargets] = useState<Record<PlanName, string>>({
    tokyo: "",
    seoul: "",
  });
  const [status, setStatus] = useState<Record<PlanName, CardStatus>>({
    tokyo: { kind: "idle" },
    seoul: { kind: "idle" },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  async function handleSubscribe(plan: PlanName) {
    const raw = targets[plan].trim();
    const target = Number(raw);
    if (!raw || !Number.isFinite(target) || target <= 0) {
      setStatus((s) => ({ ...s, [plan]: { kind: "error", message: "請輸入有效的目標價（TWD）" } }));
      return;
    }
    setStatus((s) => ({ ...s, [plan]: { kind: "saving" } }));
    const result = await subscribe({
      email: user.email ?? "",
      plan_name: plan,
      target_price: target,
    });
    if (result.ok) {
      setStatus((s) => ({ ...s, [plan]: { kind: "subscribed", target } }));
    } else {
      setStatus((s) => ({
        ...s,
        [plan]: { kind: "error", message: result.error ?? "訂閱失敗，請稍後再試" },
      }));
    }
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
        <h1 className="text-3xl font-semibold tracking-tight">選擇航線，設定目標價</h1>
        <p className="mt-2 text-muted-foreground">
          挑一條航線、填一個你能接受的台幣目標價，票價一旦低於它，我們就寄 email 通知你。
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const st = status[plan.name];
            const subscribed = st.kind === "subscribed";
            return (
              <div
                key={plan.name}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {subscribed && (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      已訂閱
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  目前最低約 NT${plan.cheapestHintTwd.toLocaleString()} — 目標價設在這附近或更低比較容易達標。
                </p>

                {subscribed ? (
                  <div className="mt-6">
                    <p className="text-sm">
                      <BellRing className="mr-1 inline size-4 text-primary" />
                      追蹤中，目標價 <span className="font-semibold">NT${st.target.toLocaleString()}</span>
                    </p>
                    <button
                      onClick={() =>
                        setStatus((s) => ({ ...s, [plan.name]: { kind: "idle" } }))
                      }
                      className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      更新目標價
                    </button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <label
                      htmlFor={`target-${plan.name}`}
                      className="block text-sm font-medium"
                    >
                      目標價 (TWD)
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id={`target-${plan.name}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder={String(plan.cheapestHintTwd)}
                        value={targets[plan.name]}
                        onChange={(e) =>
                          setTargets((t) => ({ ...t, [plan.name]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        onClick={() => handleSubscribe(plan.name)}
                        disabled={st.kind === "saving"}
                        className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {st.kind === "saving" ? "處理中…" : "開始追蹤"}
                      </button>
                    </div>
                    {st.kind === "error" && (
                      <p className="mt-2 text-sm text-destructive">{st.message}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
