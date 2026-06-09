import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ShoppingBag, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

export default function PaymentSuccess() {
  // useLocation() from wouter does NOT include the query string.
  // Always use window.location.search to read query params.
  const params  = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ref     = params.get("ref");
  const orderId = params.get("orderId");

  const [status, setStatus] = useState<"loading" | "success" | "pending">("loading");

  useEffect(() => {
    if (!ref) { setStatus("success"); return; }
    const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    fetch(`${apiBase}/api/payment/status/${ref}`)
      .then(r => r.json())
      .then((d: { status?: string }) => {
        setStatus(d.status === "success" ? "success" : "pending");
      })
      .catch(() => setStatus("success"));
  }, [ref]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          {status === "loading" ? (
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-14 w-14 text-green-500" />
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                  {status === "success" ? "Paiement réussi !" : "Paiement en cours"}
                </h1>
                <p className="text-muted-foreground">
                  {status === "success"
                    ? "Votre commande a été confirmée. Vous recevrez votre livraison très prochainement."
                    : "Votre paiement est en cours de traitement. Nous vous notifierons dès la confirmation."}
                </p>
              </div>

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
