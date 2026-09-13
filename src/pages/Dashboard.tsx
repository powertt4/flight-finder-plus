import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, BellRing } from "lucide-react";
import { usePageMeta } from "@/lib/use-page-meta";
import { useAuthUser } from "@/components/RequireAuth";
import {
  PLANS,
  subscribe,
  listSubscriptions,
  cancelSubscription,
  type PlanName,
} from "@/lib/flight-api";

// M2 paywall states of a plan card. `idle` = no (usable) subscription yet —
// this also covers legacy M1 rows that have no subscription_status, since after
// M2 those no longer receive alerts until paid.
type Card =
  | { kind: "idle" }
  | { kind: "active"; target: number }
  | { kind: "pending"; target: number }
  | { kind: "cancelled"; target: number; until?: string | undefined }
  | { kind: "expired"; target: number };

export default function Dashboard() {
  usePageMeta({
    title: "Your dashboard — Flight Price Notifier",
    description: "Your saved flight routes and price alerts.",
    robots: "noindex",
  });

  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [targets, setTargets] = useState<Record<PlanName, string>>({ tokyo: "", seoul: "" });
  const [cards, setCards] = useState<Record<PlanName, Card>>({
    tokyo: { kind: "idle" },
    seoul: { kind: "idle" },
  });
  const [editing, setEditing] = useState<Record<PlanName, boolean>>({ tokyo: false, seoul: false });
  const [busy, setBusy] = useState<Record<PlanName, boolean>>({ tokyo: false, seoul: false });
  const [errors, setErrors] = useState<Record<PlanName, string>>({ tokyo: "", seoul: "" });
  const [loading, setLoading] = useState(true);

  // Hydrate card state from the server so a reload (and returning from the
  // ECPay cashier) shows the real subscription_status, not just an in-session flip.
  const load = useCallback(() => {
    if (!user.email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listSubscriptions(user.email)
      .then((subs) => {
        const next: Record<PlanName, Card> = { tokyo: { kind: "idle" }, seoul: { kind: "idle" } };
        for (const sub of subs) {
          if (sub.plan_name !== "tokyo" && sub.plan_name !== "seoul") continue;
          const t = sub.target_price;
          switch (sub.subscription_status) {
            case "active":
              next[sub.plan_name] = { kind: "active", target: t };
              break;
            case "pending_payment":
              next[sub.plan_name] = { kind: "pending", target: t };
              break;
            case "cancelled":
              next[sub.plan_name] = { kind: "cancelled", target: t, until: sub.current_period_end_date };
              break;
            case "expired":
              next[sub.plan_name] = { kind: "expired", target: t };
              break;
            default:
              // Legacy M1 row (no status) — treat as not-yet-subscribed so the
              // user can subscribe + pay (which activates the paywall row).
              next[sub.plan_name] = { kind: "idle" };
          }
        }
        setCards(next);
      })
      .catch(() => {
        // Non-fatal: leave cards in their default (idle) state.
      })
      .finally(() => setLoading(false));
  }, [user.email]);

  useEffect(() => {
    load();
  }, [load]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  }

  function startEdit(plan: PlanName, current: number) {
    setTargets((t) => ({ ...t, [plan]: String(current) }));
    setErrors((e) => ({ ...e, [plan]: "" }));
    setEditing((x) => ({ ...x, [plan]: true }));
  }

  // Submit an intent to /subscribe. For new / pending / expired the server
  // returns the ECPay checkout HTML and the browser navigates to the cashier
  // (subscribe() handles that); for active / cancelled it's an in-place JSON
  // target update and we just re-hydrate.
  async function submit(plan: PlanName, presetTarget?: number) {
    const raw = presetTarget != null ? String(presetTarget) : targets[plan].trim();
    const target = Number(raw);
    if (!raw || !Number.isFinite(target) || target <= 0) {
      setErrors((e) => ({ ...e, [plan]: "請輸入有效的目標價（TWD）" }));
      return;
    }
    setErrors((e) => ({ ...e, [plan]: "" }));
    setBusy((b) => ({ ...b, [plan]: true }));
    const r = await subscribe({ email: user.email ?? "", plan_name: plan, target_price: target });
    setBusy((b) => ({ ...b, [plan]: false }));
    if (r.kind === "redirect") return; // navigating to ECPay's cashier
    if (r.kind === "error") {
      setErrors((e) => ({ ...e, [plan]: r.error }));
      return;
    }
    setEditing((x) => ({ ...x, [plan]: false }));
    load();
  }

  async function cancel(plan: PlanName, route: string) {
    if (!window.confirm("確定要取消訂閱嗎？本期結束前仍會收到通知，之後停止。")) return;
    setBusy((b) => ({ ...b, [plan]: true }));
    const r = await cancelSubscription(user.email ?? "", route);
    setBusy((b) => ({ ...b, [plan]: false }));
    if (!r.ok) {
      setErrors((e) => ({ ...e, [plan]: r.error ?? "取消失敗，請稍後再試" }));
      return;
    }
    load();
  }

  const badge = (card: Card): { text: string; cls: string } | null => {
    switch (card.kind) {
      case "active":
        return { text: "已訂閱（有效）", cls: "bg-primary/15 text-primary" };
      case "pending":
        return { text: "未完成付款", cls: "bg-amber-500/15 text-amber-600" };
      case "cancelled":
        return { text: "已取消", cls: "bg-muted text-muted-foreground" };
      case "expired":
        return { text: "已結束", cls: "bg-muted text-muted-foreground" };
      default:
        return null;
    }
  };

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
          <br />
          <span className="text-sm">月訂閱 NT$300 — 只有付費訂閱者收得到降價通知，隨時可取消。</span>
        </p>

        {loading && <p className="mt-6 text-sm text-muted-foreground">載入你的訂閱狀態中…</p>}

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const card = cards[plan.name];
            const b = badge(card);
            const showForm =
              card.kind === "idle" || card.kind === "expired" || editing[plan.name];
            const isBusy = busy[plan.name];
            const err = errors[plan.name];
            return (
              <div key={plan.name} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.label}</h2>
                  {b && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>
                      {b.text}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  目前最低約 NT${plan.cheapestHintTwd.toLocaleString()} — 目標價設在這附近或更低比較容易達標。
                </p>

                {/* Summary views (not editing) */}
                {!showForm && card.kind === "active" && (
                  <div className="mt-6">
                    <p className="text-sm">
                      <BellRing className="mr-1 inline size-4 text-primary" />
                      追蹤中，目標價 <span className="font-semibold">NT${card.target.toLocaleString()}</span>
                    </p>
                    <div className="mt-3 flex gap-4">
                      <button
                        onClick={() => startEdit(plan.name, card.target)}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        更新目標價
                      </button>
                      <button
                        onClick={() => cancel(plan.name, plan.route)}
                        disabled={isBusy}
                        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        取消訂閱
                      </button>
                    </div>
                  </div>
                )}

                {!showForm && card.kind === "cancelled" && (
                  <div className="mt-6">
                    <p className="text-sm">
                      已取消，仍會通知到 <span className="font-semibold">{card.until ?? "本期結束"}</span>
                      ，之後自動停止。目標價 NT${card.target.toLocaleString()}。
                    </p>
                    <button
                      onClick={() => startEdit(plan.name, card.target)}
                      className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      更新目標價
                    </button>
                  </div>
                )}

                {!showForm && card.kind === "pending" && (
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground">
                      訂單已建立，但尚未完成付款——付款後才會開始收到降價通知。
                    </p>
                    <button
                      onClick={() => submit(plan.name, card.target)}
                      disabled={isBusy}
                      className="mt-3 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isBusy ? "處理中…" : "完成付款"}
                    </button>
                    {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
                  </div>
                )}

                {/* Form view: new / expired / editing an existing target */}
                {showForm && (
                  <div className="mt-6">
                    <label htmlFor={`target-${plan.name}`} className="block text-sm font-medium">
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
                        onClick={() => submit(plan.name)}
                        disabled={isBusy}
                        className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isBusy
                          ? "處理中…"
                          : editing[plan.name]
                            ? "更新目標價"
                            : card.kind === "expired"
                              ? "重新訂閱"
                              : "開始追蹤（前往付款）"}
                      </button>
                    </div>
                    {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
                    {editing[plan.name] && (
                      <button
                        onClick={() => setEditing((x) => ({ ...x, [plan.name]: false }))}
                        className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        取消編輯
                      </button>
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
