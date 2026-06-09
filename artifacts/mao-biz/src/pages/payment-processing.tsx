/**
 * /paiement  — page intermédiaire vers laquelle Diamanopay redirige l'utilisateur.
 *
 * Diamanopay appends its own query params directly onto our ref value, e.g.:
 *   /paiement?ref=MAO-32-1781013303372?success=true
 * We strip the ref suffix and read Diamanopay's status from it.
 *
 * If Diamanopay signals success=true, we call /api/payment/confirm immediately
 * (no polling delay). Otherwise we poll /api/payment/status/:ref.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";

const MAX_POLL_MS   = 120_000;
const POLL_INTERVAL =   3_000;

function parsePaymentUrl() {
  if (typeof window === "undefined") return { ref: "", diamanopaySuccess: false, diamanopayFailed: false };

  const params = new URLSearchParams(window.location.search);
  const rawRef = params.get("ref") ?? "";

  // Diamanopay appends ?success=true to our ref value instead of using &
  // e.g. rawRef = "MAO-32-1781013303372?success=true"
  const qIdx   = rawRef.indexOf("?");
  const cleanRef   = qIdx >= 0 ? rawRef.slice(0, qIdx) : rawRef;
  const refSuffix  = qIdx >= 0 ? rawRef.slice(qIdx + 1) : "";
  const refParams  = new URLSearchParams(refSuffix);

  // Collect Diamanopay's status from all possible locations
  const successSignals = [
    params.get("success"),
    refParams.get("success"),
    params.get("status"),
    refParams.get("status"),
  ].map((v) => (v ?? "").toLowerCase());

  const failureSignals = [
    params.get("failure"),
    params.get("failed"),
    params.get("error"),
    refParams.get("failure"),
    refParams.get("failed"),
    refParams.get("error"),
  ].map((v) => (v ?? "").toLowerCase());

  const diamanopaySuccess =
    successSignals.includes("true") ||
    successSignals.includes("success") ||
    successSignals.includes("paid") ||
    successSignals.includes("completed");

  const diamanopayFailed =
    failureSignals.includes("true") ||
    successSignals.includes("failed") ||
    successSignals.includes("failure") ||
    successSignals.includes("cancelled") ||
    successSignals.includes("expired");

  return { ref: cleanRef, diamanopaySuccess, diamanopayFailed };
}

export default function PaymentProcessing() {
  const { ref, diamanopaySuccess, diamanopayFailed } = parsePaymentUrl();
  const [, setLocation] = useLocation();
  const elapsed = useRef(0);
  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  useEffect(() => {
    if (!ref) {
      setLocation("/payment-error?reason=missing_ref");
      return;
    }

    let cancelled = false;

    // -----------------------------------------------------------------------
    // Fast path: Diamanopay already told us the payment succeeded.
    // Call /confirm to update the DB and redirect immediately.
    // -----------------------------------------------------------------------
    if (diamanopaySuccess) {
      (async () => {
        try {
          const r = await fetch(`${apiBase}/api/payment/confirm`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ref }),
            signal:  AbortSignal.timeout(15_000),
          });
          if (r.ok) {
            const d: { status?: string; orderId?: number; clientReference?: string } = await r.json();
            if (!cancelled) {
              const successRef = d.clientReference ?? ref;
              setLocation(
                `/payment-success?ref=${encodeURIComponent(successRef)}&orderId=${d.orderId ?? ""}`
              );
            }
            return;
          }
        } catch {
          // API cold-starting — fall through to polling
        }
        if (!cancelled) startPolling();
      })();
      return () => { cancelled = true; };
    }

    // -----------------------------------------------------------------------
    // Fast failure path
    // -----------------------------------------------------------------------
    if (diamanopayFailed) {
      setLocation(`/payment-error?ref=${encodeURIComponent(ref)}&reason=failed`);
      return;
    }

    // -----------------------------------------------------------------------
    // Normal polling path (no explicit signal from Diamanopay)
    // -----------------------------------------------------------------------
    startPolling();
    return () => { cancelled = true; };

    function startPolling() {
      const poll = async () => {
        if (cancelled) return;
        try {
          const r = await fetch(
            `${apiBase}/api/payment/status/${encodeURIComponent(ref)}`,
            { signal: AbortSignal.timeout(10_000) }
          );
          if (r.ok) {
            const d: { status?: string; orderId?: number; clientReference?: string } = await r.json();
            if (d.status === "success") {
              const successRef = d.clientReference ?? ref;
              setLocation(
                `/payment-success?ref=${encodeURIComponent(successRef)}&orderId=${d.orderId ?? ""}`
              );
              return;
            }
            if (d.status === "failed" || d.status === "cancelled" || d.status === "expired") {
              setLocation(`/payment-error?ref=${encodeURIComponent(ref)}&reason=${d.status}`);
              return;
            }
          }
        } catch {
          // API unavailable — keep trying
        }

        elapsed.current += POLL_INTERVAL;
        if (elapsed.current >= MAX_POLL_MS) {
          setLocation(`/payment-error?ref=${encodeURIComponent(ref)}&reason=not_found`);
          return;
        }
        setTimeout(poll, POLL_INTERVAL);
      };

      void poll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-14 w-14 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
              {diamanopaySuccess ? "Confirmation en cours…" : "Traitement du paiement…"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {diamanopaySuccess
                ? "Paiement reçu, enregistrement de votre commande…"
                : "Votre paiement est en cours de confirmation.\nVeuillez patienter, ne fermez pas cette page."}
            </p>
          </div>
          {ref && (
            <div className="bg-muted rounded-xl px-4 py-2 text-xs font-mono text-muted-foreground break-all">
              {ref}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
