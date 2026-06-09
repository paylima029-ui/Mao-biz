import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  createCharge,
  getTransaction,
  getAccessToken,
  PROVIDER_MAP,
  DIAMANOPAY_CONFIGURED,
} from "../lib/diamanopay";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBaseUrl(): string {
  return (
    process.env.BASE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    (process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:8080")
  ).replace(/\/$/, "");
}

function makeClientRef(orderId: number): string {
  return `MAO-${orderId}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// POST /api/payment/create
// ---------------------------------------------------------------------------
router.post("/create", async (req, res) => {
  const { orderId } = req.body ?? {};
  if (!orderId) return res.status(400).json({ error: "orderId requis" });

  if (!DIAMANOPAY_CONFIGURED) {
    return res.status(503).json({
      error: "Paiement en ligne non disponible : DIAMONOPAY_ACCESS_TOKEN ou DIAMONOPAY_CLIENT_ID/CLIENT_SECRET manquant.",
    });
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderId)));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const provider = PROVIDER_MAP[order.paymentMethod];
  if (!provider) {
    return res.status(400).json({ error: `Mode de paiement non supporté: ${order.paymentMethod}` });
  }

  const base           = getBaseUrl();
  const clientReference = makeClientRef(order.id);

  try {
    const charge = await createCharge({
      amount:          Number(order.total),
      provider,
      description:     `Commande MAO-BIZ #${order.orderNumber}`,
      clientReference,
      customerPhone:   order.customerPhone,
      redirectUrl:     `${base}/api/payment/callback?ref=${clientReference}`,
      webhookUrl:      `${base}/api/payment/webhook`,
      extraData: {
        orderId:       order.id,
        orderNumber:   order.orderNumber,
        customerName:  order.customerName,
        paymentMethod: order.paymentMethod,
      },
    });

    // Persist transaction
    await db.insert(transactionsTable).values({
      transactionId:   charge.chargeId ?? null,
      chargeId:        charge.chargeId ?? null,
      clientReference,
      orderId:         order.id,
      customerName:    order.customerName,
      customerPhone:   order.customerPhone,
      amount:          String(order.total),
      currency:        "XOF",
      paymentMethod:   order.paymentMethod,
      status:          "pending",
      paymentUrl:      charge.paymentUrl,
    });

    await db.update(ordersTable)
      .set({ status: "payment_initiated" })
      .where(eq(ordersTable.id, order.id));

    return res.json({ paymentUrl: charge.paymentUrl, clientReference });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ msg, orderId }, "Diamanopay createCharge échoué");

    // Save failed transaction for traceability
    await db.insert(transactionsTable).values({
      clientReference,
      orderId:      order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      amount:       String(order.total),
      currency:     "XOF",
      paymentMethod: order.paymentMethod,
      status:       "failed",
      errorMessage: msg,
    }).onConflictDoNothing();

    return res.status(502).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payment/callback  — Diamanopay redirects the user here
// Diamanopay may redirect without any ?status param, or with various param
// names/values depending on the provider. We treat the redirect as success
// unless the status is explicitly a failure/cancel signal.
// The webhook (POST) is the authoritative source for final status.
// ---------------------------------------------------------------------------
router.get("/callback", async (req, res) => {
  const ref = req.query.ref as string | undefined;

  // Log every query param Diamanopay sends so we can see exactly what arrives
  logger.info({ query: req.query }, "Diamanopay callback reçu");

  if (!ref) return res.redirect("/payment-error?reason=missing_ref");

  const [txn] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.clientReference, ref));

  if (!txn) return res.redirect("/payment-error?reason=not_found");

  // Collect all possible status indicators Diamanopay might send
  const rawStatus = (
    req.query.status ??
    req.query.payment_status ??
    req.query.result ??
    req.query.state ??
    ""
  ) as string;
  const upperStatus = rawStatus.toUpperCase();

  // Only treat as explicit failure if Diamanopay says so clearly
  const FAILURE_STATUSES = ["FAILED", "FAILURE", "CANCELLED", "CANCELED", "EXPIRED", "ERROR", "REJECTED"];
  const isExplicitFailure = FAILURE_STATUSES.includes(upperStatus);

  // If no status was sent, or it's a positive/unknown value → treat as success
  // (Diamanopay often redirects to the URL only on success, relying on webhook for real confirmation)
  const newStatus = isExplicitFailure ? "failed" : "success";

  await db.update(transactionsTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(transactionsTable.clientReference, ref));

  if (txn.orderId) {
    await db.update(ordersTable)
      .set({ status: isExplicitFailure ? "pending" : "confirmed" })
      .where(eq(ordersTable.id, txn.orderId));
  }

  logger.info({ ref, rawStatus, upperStatus, newStatus }, "Diamanopay callback traité");

  if (isExplicitFailure) {
    return res.redirect(`/payment-error?ref=${ref}&reason=${upperStatus.toLowerCase()}`);
  }
  return res.redirect(`/payment-success?ref=${ref}&orderId=${txn.orderId ?? ""}`);
});

// ---------------------------------------------------------------------------
// POST /api/payment/webhook  — server-to-server notification from Diamanopay
// ---------------------------------------------------------------------------
router.post("/webhook", async (req, res) => {
  const body = req.body ?? {};
  logger.info({ body }, "Diamanopay webhook reçu");

  const ref       = body.clientReference ?? body.extraData?.clientReference;
  const txnId     = body.transactionId   ?? body.id ?? body.chargeId;
  const rawStatus = (body.status ?? body.paymentStatus ?? body.payment_status ?? "").toUpperCase();
  const success   = ["SUCCESS", "PAID", "COMPLETED", "SUCCESSFUL"].includes(rawStatus);
  const newStatus = success ? "success" : (rawStatus === "FAILED" ? "failed" : "pending");

  if (ref) {
    await db.update(transactionsTable)
      .set({
        status:      newStatus,
        transactionId: txnId ? String(txnId) : undefined,
        webhookData: body,
        updatedAt:   new Date(),
      })
      .where(eq(transactionsTable.clientReference, String(ref)));

    const [txn] = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.clientReference, String(ref)));

    if (txn?.orderId) {
      await db.update(ordersTable)
        .set({ status: success ? "confirmed" : newStatus })
        .where(eq(ordersTable.id, txn.orderId));
    }
    logger.info({ ref, newStatus }, "Transaction mise à jour via webhook");
  }

  return res.json({ received: true });
});

// ---------------------------------------------------------------------------
// GET /api/payment/status/:transactionId
// ---------------------------------------------------------------------------
router.get("/status/:transactionId", async (req, res) => {
  const { transactionId } = req.params;

  // 1. Check local DB first
  const [local] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.clientReference, transactionId));

  if (!local) {
    return res.status(404).json({ error: "Transaction introuvable" });
  }

  // 2. If pending, try to refresh from Diamanopay
  if (local.status === "pending" && local.transactionId && DIAMANOPAY_CONFIGURED) {
    try {
      const remote = await getTransaction(local.transactionId);
      const remoteStatus = remote.status === "SUCCESS" || remote.status === "PAID"
        ? "success"
        : remote.status === "FAILED" ? "failed" : local.status;

      if (remoteStatus !== local.status) {
        await db.update(transactionsTable)
          .set({ status: remoteStatus, updatedAt: new Date() })
          .where(eq(transactionsTable.id, local.id));
        local.status = remoteStatus;

        if (local.orderId) {
          await db.update(ordersTable)
            .set({ status: remoteStatus === "success" ? "confirmed" : "pending" })
            .where(eq(ordersTable.id, local.orderId));
        }
      }
    } catch (err) {
      logger.warn({ err, transactionId }, "Impossible de rafraîchir depuis Diamanopay");
    }
  }

  return res.json({
    transactionId:   local.transactionId,
    clientReference: local.clientReference,
    orderId:         local.orderId,
    status:          local.status,
    amount:          local.amount,
    currency:        local.currency,
    paymentMethod:   local.paymentMethod,
    customerName:    local.customerName,
    createdAt:       local.createdAt,
    updatedAt:       local.updatedAt,
  });
});

// ---------------------------------------------------------------------------
// POST /api/payment/initiate  — backward compat alias (kept for old clients)
// ---------------------------------------------------------------------------
router.post("/initiate", async (req, res) => {
  req.body = req.body ?? {};
  const { orderId } = req.body as { orderId?: unknown };
  if (!orderId) return res.status(400).json({ error: "orderId requis" });

  if (!DIAMANOPAY_CONFIGURED) {
    return res.status(503).json({
      error: "Paiement en ligne non disponible : DIAMONOPAY_ACCESS_TOKEN ou DIAMONOPAY_CLIENT_ID/CLIENT_SECRET manquant.",
    });
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderId)));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const provider = PROVIDER_MAP[order.paymentMethod];
  if (!provider) {
    return res.status(400).json({ error: `Mode de paiement non supporté: ${order.paymentMethod}` });
  }

  const base            = getBaseUrl();
  const clientReference = makeClientRef(order.id);

  try {
    const charge = await createCharge({
      amount:          Number(order.total),
      provider,
      description:     `Commande MAO-BIZ #${order.orderNumber}`,
      clientReference,
      customerPhone:   order.customerPhone,
      redirectUrl:     `${base}/api/payment/callback?ref=${clientReference}`,
      webhookUrl:      `${base}/api/payment/webhook`,
    });

    await db.insert(transactionsTable).values({
      transactionId:   charge.chargeId ?? null,
      chargeId:        charge.chargeId ?? null,
      clientReference,
      orderId:         order.id,
      customerName:    order.customerName,
      customerPhone:   order.customerPhone,
      amount:          String(order.total),
      currency:        "XOF",
      paymentMethod:   order.paymentMethod,
      status:          "pending",
      paymentUrl:      charge.paymentUrl,
    });

    await db.update(ordersTable).set({ status: "payment_initiated" }).where(eq(ordersTable.id, order.id));
    return res.json({ paymentUrl: charge.paymentUrl, clientReference });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/payment/test  — diagnostic (remove in prod)
// ---------------------------------------------------------------------------
router.get("/test", async (_req, res) => {
  const cfg = {
    DIAMONOPAY_API_URL:      process.env.DIAMONOPAY_API_URL || "❌ manquant",
    DIAMONOPAY_ACCESS_TOKEN: process.env.DIAMONOPAY_ACCESS_TOKEN
      ? `✅ défini (${process.env.DIAMONOPAY_ACCESS_TOKEN.slice(0, 10)}...)`
      : "— non défini (utiliser OAuth2)",
    DIAMONOPAY_CLIENT_ID:     process.env.DIAMONOPAY_CLIENT_ID
      ? `✅ défini (${process.env.DIAMONOPAY_CLIENT_ID.slice(0, 6)}...)`
      : "❌ manquant",
    DIAMONOPAY_CLIENT_SECRET: process.env.DIAMONOPAY_CLIENT_SECRET
      ? `✅ défini (${process.env.DIAMONOPAY_CLIENT_SECRET.slice(0, 8)}...)`
      : "❌ manquant",
  };

  if (!DIAMANOPAY_CONFIGURED) {
    return res.status(503).json({ status: "❌ Configuration incomplète", config: cfg });
  }

  let tokenStatus = "";
  let token = "";
  try {
    token = await getAccessToken();
    tokenStatus = `✅ token obtenu (${token.slice(0, 10)}...)`;
  } catch (e) {
    tokenStatus = `❌ ${e instanceof Error ? e.message : String(e)}`;
  }

  let chargesResult: unknown = null;
  if (token) {
    try {
      const r = await fetch(`${(process.env.DIAMONOPAY_API_URL ?? "https://api.diamanopay.com").replace(/\/$/, "")}/api/charges`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount: 100, provider: "WAVE", description: "test",
          clientReference: `DIAG-${Date.now()}`,
          redirectUrl: "https://example.com",
          webhook:     "https://example.com/wh",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const txt = await r.text();
      try { chargesResult = { status: r.status, body: JSON.parse(txt) }; }
      catch { chargesResult = { status: r.status, body: txt }; }
    } catch (e) {
      chargesResult = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return res.json({ config: cfg, tokenStatus, chargesEndpoint: chargesResult });
});

export default router;
