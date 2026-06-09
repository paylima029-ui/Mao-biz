import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ShoppingBag, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

const MAX_POLL_MS   = 90_000;
const POLL_INTERVAL = 3_000;

export default function PaymentSuccess() {
  const params  = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ref     = params.get("ref");
  const orderId = params.get("orderId");

  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    if (!ref) {
      setStatus("success");
      return;
    }

    const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    let elapsed = 0;

    const poll = async () => {
      if (cancelled.current) return;
      try {
        const r = await fetch(`${apiBase}/api/payment/status/${ref}`);
        const d: { status?: string } = await r.json();

        if (d.status === "success") {
          setStatus("success");
          return;
        }
      } catch {
        setStatus("success");
        return;
      }

      elapsed += POLL_INTERVAL;
      if (elapsed >= MAX_POLL_MS) {
        setStatus("pending");
        return;
      }

      setTimeout(poll, POLL_INTERVAL);
    };

    poll();

    return () => {
      cancelled.current = true;
    };
  }, [ref]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          {status === "loading" ? (
            <>
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Confirmation du paiement en cours…</p>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-14 w-14 text-green-500" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                  {status === "success" ? "Paiement réussi !" : "Paiement en cours de traitement"}
                </h1>
                <p className="text-muted-foreground">
                  {status === "success"
                    ? "Votre commande a été confirmée. Vous recevrez votre livraison très prochainement."
                    : "Votre paiement est en cours de confirmation. Vous pouvez fermer cette page — nous vous contacterons dès la validation."}
                </p>
              </div>

              {status === "pending" && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Toujours en attente de confirmation…</span>
                </div>
              )}

              {(ref || orderId) && (
                <div className="bg-muted rounded-xl p-4 text-sm text-left space-y-1">
                  {orderId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commande</span>
                      <span className="font-semibold">#{orderId}</span>
                    </div>
                  )}
                  {ref && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Référence</span>
                      <span className="font-mono text-xs">{ref}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="font-bold text-white">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Retour à l'accueil
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Continuer mes achats
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
