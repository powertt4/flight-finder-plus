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

export async function subscribe(input: SubscribeInput): Promise<{ ok: boolean; route?: string; error?: string }> {
  const res = await fetch(`${FLIGHT_API_URL}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
  }
  const route = (data as { route?: string }).route;
  return route ? { ok: true, route } : { ok: true };
}
