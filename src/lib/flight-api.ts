// Flight Price Notifier — API client config.
//
// The API base points at the AWS API Gateway HTTP API that fronts the
// flight Lambdas. It is a PUBLIC endpoint (no secret): the browser only ever
// POSTs subscription intent here — no AWS credentials live in the front-end.
// Override at build time with VITE_FLIGHT_API_URL in the Vercel project's
// environment variables; the fallback keeps local/dev builds working.
export const FLIGHT_API_URL =
  import.meta.env["VITE_FLIGHT_API_URL"] ??
  "https://1chaw7sna1.execute-api.us-east-1.amazonaws.com";

export type PlanName = "tokyo" | "seoul";

export interface Plan {
  name: PlanName;
  label: string; // 顯示名稱
  route: string; // origin-destination
  // A hint of the current cheapest fare (TWD) so the user picks a sane target.
  cheapestHintTwd: number;
}

export const PLANS: Plan[] = [
  { name: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", cheapestHintTwd: 9325 },
  { name: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", cheapestHintTwd: 5989 },
];

export interface SubscribeInput {
  email: string;
  plan_name: PlanName;
  target_price: number; // TWD
}

// M2: /subscribe now returns one of two content types.
//  - text/html         → an ECPay auto-submit checkout form. We hand the whole
//                        document to it so the browser POSTs to ECPay's cashier
//                        (new / pending_payment / expired → payment required).
//  - application/json  → an in-place update with no re-payment (active or
//                        cancelled-in-grace users changing their target price).
// The M1 client blindly called res.json(), which throws on the HTML form and
// left the button dead — hence the Content-Type branch below.
export type SubscribeResult =
  | { kind: "redirect" } // browser was handed to the ECPay cashier
  | { kind: "updated"; status?: string | undefined; route?: string | undefined }
  | { kind: "error"; error: string };

export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  let res: Response;
  try {
    res = await fetch(`${FLIGHT_API_URL}/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { kind: "error", error: "網路錯誤，請稍後再試" };
  }

  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("text/html")) {
    // ECPay auto-submit form — replace the document so its inline
    // <script>…submit()</script> POSTs the user to ECPay's cashier.
    const html = await res.text();
    document.open();
    document.write(html);
    document.close();
    return { kind: "redirect" };
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    status?: string;
    route?: string;
  };
  if (!res.ok) {
    return { kind: "error", error: data.error ?? `HTTP ${res.status}` };
  }
  return { kind: "updated", status: data.status, route: data.route };
}

export type SubscriptionStatus =
  | "active"
  | "pending_payment"
  | "cancelled"
  | "expired";

export interface Subscription {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number; // TWD
  currency: string;
  // M2 paywall fields (absent on legacy M1 rows).
  subscription_status?: SubscriptionStatus;
  merchant_trade_no?: string;
  current_period_end?: string;
  current_period_end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const res = await fetch(
    `${FLIGHT_API_URL}/subscriptions?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as { subscriptions?: Subscription[] };
  return data.subscriptions ?? [];
}

// M2: cancel a recurring subscription. The Lambda calls ECPay's
// CreditCardPeriodAction (stops future renewals) and flips the row to
// `cancelled`, keeping service until current_period_end (a grace period).
export async function cancelSubscription(
  email: string,
  route: string,
): Promise<{
  ok: boolean;
  status?: string | undefined;
  current_period_end?: string | undefined;
  error?: string | undefined;
}> {
  let res: Response;
  try {
    res = await fetch(`${FLIGHT_API_URL}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, route }),
    });
  } catch {
    return { ok: false, error: "網路錯誤，請稍後再試" };
  }
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    current_period_end?: string;
    error?: string;
  };
  if (!res.ok) {
    return { ok: false, error: data.error ?? `HTTP ${res.status}` };
  }
  return { ok: true, status: data.status, current_period_end: data.current_period_end };
}
