/**
 * /paiement  — page intermédiaire vers laquelle Diamanopay redirige l'utilisateur.
 *
 * Comme c'est une page Vite statique, elle se charge quasi-instantanément
 * même quand l'API Render est en cold-start. Elle affiche un spinner et
 * poll /api/payment/status/:ref en arrière-plan, puis redirige vers
 * /payment-success ou /payment-error selon le résultat.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";

const MAX_POLL_MS    = 120_000; // 2 minutes
const POLL_INTERVAL  =   3_000; // 3 secondes

export default function PaymentProcessing() {
  const params  = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ref       = params.get("ref") ?? "";
  const [, setLocation] = useLocation();
  const elapsed   = useRef(0);

  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  useEffect(() => {
    if (!ref) {
      setLocation("/payment-error?reason=missing_ref");
      return;
    }

    let cancelled = false;

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
          // status === "pending" or "payment_initiated" → keep polling
        }
        // 404 or other error → transaction not yet visible, keep polling
      } catch {
        // network timeout or API cold-start → keep polling
      }

      elapsed.current += POLL_INTERVAL;
      if (elapsed.current >= MAX_POLL_MS) {
        // Timed out — show error with ref so the user can retry
        setLocation(`/payment-error?ref=${encodeURIComponent(ref)}&reason=not_found`);
        return;
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    // Start polling immediately — no initial delay
    void poll();

    return () => { cancelled = true; };
  }, [ref, apiBase, setLocation]);

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
              Traitement du paiement…
            </h1>
            <p className="text-muted-foreground text-sm">
              Votre paiement est en cours de confirmation.
              <br />
              Veuillez patienter, ne fermez pas cette page.
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
