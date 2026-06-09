import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { XCircle, RotateCcw, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

const REASON_LABELS: Record<string, string> = {
  failed:          "Le paiement a été refusé.",
  failure:         "Le paiement a été refusé.",
  cancelled:       "Vous avez annulé le paiement.",
  canceled:        "Vous avez annulé le paiement.",
  expired:         "La session de paiement a expiré.",
  rejected:        "Le paiement a été rejeté.",
  error:           "Une erreur est survenue côté opérateur.",
  missing_ref:     "Référence de paiement manquante.",
  not_found:       "Transaction introuvable.",
  unknown:         "Une erreur inconnue s'est produite.",
};

const MAX_POLL_MS   = 90_000;
const POLL_INTERVAL = 4_000;

export default function PaymentError() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const reason  = params.get("reason") ?? "unknown";
  const ref     = params.get("ref");

  const message = REASON_LABELS[reason] ?? REASON_LABELS.unknown;

  const [checking, setChecking]   = useState(!!ref);
  const [, setLocation]           = useLocation();

  useEffect(() => {
    if (!ref) return;

    let elapsed  = 0;
    let cancelled = false;

    const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`${apiBase}/api/payment/status/${ref}`);
        const d: { status?: string; orderId?: number } = await r.json();

        if (d.status === "success") {
          setLocation(`/payment-success?ref=${ref}&orderId=${d.orderId ?? ""}`);
          return;
        }
      } catch {
        // ignore network errors during polling
      }

      elapsed += POLL_INTERVAL;
      if (elapsed >= MAX_POLL_MS) {
        setChecking(false);
        return;
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    const timer = setTimeout(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ref, setLocation]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-14 w-14 text-red-500" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Paiement échoué</h1>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {ref && (
            <div className="bg-muted rounded-xl p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono text-xs">{ref}</span>
              </div>
            </div>
          )}

          {checking ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification du statut en cours…</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Votre commande est enregistrée. Vous pouvez réessayer le paiement ou choisir
              le paiement à la livraison.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="font-bold text-white">
              <Link href="/checkout">
                <RotateCcw className="h-4 w-4 mr-2" />
                Réessayer
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
