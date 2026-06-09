import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Config — read once at startup
// ---------------------------------------------------------------------------
const BASE_URL      = (process.env.DIAMONOPAY_API_URL ?? "https://api.diamanopay.com").replace(/\/$/, "");
const CLIENT_ID     = process.env.DIAMONOPAY_CLIENT_ID     ?? "";
const CLIENT_SECRET = process.env.DIAMONOPAY_CLIENT_SECRET ?? "";
const ACCESS_TOKEN  = process.env.DIAMONOPAY_ACCESS_TOKEN  ?? ""; // long-lived token (Method B)

export const DIAMANOPAY_CONFIGURED =
  !!BASE_URL && (!!ACCESS_TOKEN || (!!CLIENT_ID && !!CLIENT_SECRET));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type PaymentProvider = "WAVE" | "ORANGE_MONEY" | "FREE_MONEY" | "EXPRESSO";

export interface CreateChargeParams {
  amount:          number;
  provider:        PaymentProvider;
  description:     string;
  clientReference: string;
  customerPhone?:  string;
  redirectUrl:     string;
  webhookUrl:      string;
  extraData?:      Record<string, unknown>;
}

export interface ChargeResponse {
  chargeId?:   string;
  paymentUrl:  string;
  status:      string;
  raw:         Record<string, unknown>;
}

export interface TransactionStatus {
  transactionId: string;
  status:        string;
  amount?:       number;
  currency?:     string;
  paymentMethod?: string;
  raw:           Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------
interface TokenCache { token: string; expiresAt: number }
let _cache: TokenCache | null = null;

// OAuth2 token endpoint paths to try in order
const TOKEN_PATHS = [
  "/api/auth/access-token",
  "/api/oauth2/token",
  "/api/oauth/token",
  "/api/auth/token",
  "/api/token",
  "/oauth2/token",
  "/oauth/token",
  "/connect/token",
];

async function fetchOAuthToken(): Promise<string | null> {
  const bodyJson = JSON.stringify({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type:    "client_credentials",
  });
  const bodyForm = `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&grant_type=client_credentials`;

  for (const path of TOKEN_PATHS) {
    for (const [ct, body] of [
      ["application/json",                bodyJson],
      ["application/x-www-form-urlencoded", bodyForm],
    ] as [string, string][]) {
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method:  "POST",
          headers: { "Content-Type": ct },
          body,
          signal:  AbortSignal.timeout(10_000),
        });
        if (res.status === 404) continue;
        if (!res.ok) {
          logger.warn({ path, status: res.status }, "Diamanopay token endpoint non-OK");
          continue;
        }
        const data = await res.json() as Record<string, unknown>;
        const tok = (data.access_token ?? data.token ?? data.accessToken) as string | undefined;
        if (tok) {
          logger.info({ path }, "Diamanopay OAuth2 token obtenu");
          return tok;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function getAccessToken(): Promise<string> {
  // Method B: direct long-lived token configured
  if (ACCESS_TOKEN) return ACCESS_TOKEN;

  // Check cache
  if (_cache && _cache.expiresAt > Date.now() + 60_000) {
    return _cache.token;
  }

  // Method A: OAuth2
  const token = await fetchOAuthToken();
  if (token) {
    // Cache for 50 minutes (most OAuth2 tokens last 1h)
    _cache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
    return token;
  }

  // Last resort: use client_secret directly (some providers issue it as a bearer key)
  if (CLIENT_SECRET) {
    logger.warn("Diamanopay: aucun endpoint OAuth2 trouvé — utilisation du client_secret comme Bearer");
    return CLIENT_SECRET;
  }

  throw new Error(
    "Diamanopay non configuré. Ajoutez DIAMONOPAY_ACCESS_TOKEN (long-lived token) " +
    "ou DIAMONOPAY_CLIENT_ID + DIAMONOPAY_CLIENT_SECRET (OAuth2)."
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  logger.info({ path, status: res.status, body: text.slice(0, 500) }, "Diamanopay response");

  let data: Record<string, unknown>;
  try { data = JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(`Réponse non-JSON de Diamanopay (${res.status}): ${text.slice(0, 200)}`); }

  if (!res.ok) {
    const msg = (data.message ?? data.error ?? data.detail ?? `HTTP ${res.status}`) as string;
    throw new Error(`Diamanopay ${path} échoué (${res.status}): ${msg}`);
  }

  return data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  logger.info({ path, status: res.status }, "Diamanopay GET response");

  let data: Record<string, unknown>;
  try { data = JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(`Réponse non-JSON (${res.status}): ${text.slice(0, 200)}`); }

  if (!res.ok) {
    const msg = (data.message ?? data.error ?? `HTTP ${res.status}`) as string;
    throw new Error(`Diamanopay ${path} (${res.status}): ${msg}`);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Extract a valid https:// URL from an API response
// ---------------------------------------------------------------------------
function extractUrl(data: Record<string, unknown>): string | null {
  const inner = (data.data && typeof data.data === "object"
    ? data.data
    : data) as Record<string, unknown>;

  const candidates = [
    inner.paymentUrl, inner.payment_url, inner.checkoutUrl, inner.checkout_url,
    inner.redirectUrl, inner.redirect_url, inner.url, inner.link,
    inner.paymentLink, inner.payment_link,
    data.paymentUrl, data.payment_url, data.checkoutUrl, data.url, data.link,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
  const payload = {
    amount:          params.amount,
    provider:        params.provider,
    description:     params.description,
    clientReference: params.clientReference,
    ...(params.customerPhone ? { customerPhone: params.customerPhone } : {}),
    redirectUrl:     params.redirectUrl,
    webhook:         params.webhookUrl,
    extraData:       params.extraData ?? {},
  };

  const raw = await apiPost<Record<string, unknown>>("/api/charges", payload);
  const inner = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;

  const paymentUrl = extractUrl(raw);
  if (!paymentUrl) {
    throw new Error(
      `Diamanopay: URL de paiement introuvable dans la réponse. Champs reçus: ${Object.keys(inner).join(", ")}`
    );
  }

  const chargeId = (
    inner.id ?? inner.chargeId ?? inner.charge_id ??
    raw.id ?? raw.chargeId
  ) as string | undefined;

  return {
    chargeId:   chargeId ? String(chargeId) : undefined,
    paymentUrl,
    status:     String(inner.status ?? raw.status ?? "pending"),
    raw,
  };
}

export async function getTransaction(transactionId: string): Promise<TransactionStatus> {
  const raw = await apiGet<Record<string, unknown>>(`/api/transactions/${transactionId}`);
  const inner = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Record<string, unknown>;

  return {
    transactionId: String(inner.id ?? inner.transactionId ?? transactionId),
    status:        String(inner.status ?? "unknown").toUpperCase(),
    amount:        inner.amount ? Number(inner.amount) : undefined,
    currency:      inner.currency ? String(inner.currency) : undefined,
    paymentMethod: inner.provider ? String(inner.provider) : undefined,
    raw,
  };
}

export const PROVIDER_MAP: Record<string, PaymentProvider> = {
  wave:         "WAVE",
  orange_money: "ORANGE_MONEY",
  free_money:   "FREE_MONEY",
  expresso:     "EXPRESSO",
};
