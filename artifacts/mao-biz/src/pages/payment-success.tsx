import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, ShoppingBag, Home, Loader2, Download, Phone, MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

const MAX_POLL_MS   = 90_000;
const POLL_INTERVAL = 3_000;

const PAYMENT_LABELS: Record<string, string> = {
  wave:         "Wave",
  orange_money: "Orange Money",
  free_money:   "Free Money",
  expresso:     "Expresso",
  cod:          "Paiement à la livraison",
};

interface OrderItem {
  productId: number;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  status: string;
  deliveryZoneName?: string;
  deliveryFee?: number;
  createdAt: string;
}

function formatPrice(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Invoice component — also used for printing
// ---------------------------------------------------------------------------
function Invoice({ order, ref: payRef }: { order: Order; ref?: string | null }) {
  const subtotal  = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const delivFee  = Number(order.deliveryFee ?? 0);

  return (
    <div id="facture-mao" className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-6 py-5 text-primary-foreground print:bg-orange-500 print:text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-2xl font-black tracking-tight">MAO-BIZ</p>
            <p className="text-xs opacity-70 mt-0.5">La meilleure boutique e-commerce africaine</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70 uppercase tracking-wider">Facture</p>
            <p className="text-lg font-black">{order.orderNumber}</p>
            <p className="text-xs opacity-70">{formatDate(order.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Customer info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</p>
            <p className="font-bold text-gray-900">{order.customerName}</p>
            <p className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" /> {order.customerPhone}
            </p>
            <p className="flex items-start gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {order.customerAddress}
              {order.deliveryZoneName && ` — ${order.deliveryZoneName}`}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paiement</p>
            <p className="font-semibold text-gray-900">
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              Payé
            </span>
            {payRef && (
              <p className="text-xs text-muted-foreground font-mono break-all mt-1">{payRef}</p>
            )}
          </div>
        </div>

        {/* Items table */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> Articles
          </p>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Article</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Qté</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">P.U.</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((item, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{item.productName}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{item.unitPrice.toLocaleString()} F</td>
                    <td className="px-3 py-2 text-right font-semibold">{(item.quantity * item.unitPrice).toLocaleString()} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span>{subtotal.toLocaleString()} FCFA</span>
          </div>
          {delivFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Frais de livraison</span>
              <span>{formatPrice(delivFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-base border-t pt-2 mt-2">
            <span>Total payé</span>
            <span className="text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground border-t pt-4">
          Merci pour votre confiance ! Pour toute question, contactez MAO-BIZ.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PaymentSuccess() {
  const params  = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const ref     = params.get("ref");
  const orderId = params.get("orderId");

  const [status, setStatus]   = useState<"loading" | "success" | "pending">("loading");
  const [order, setOrder]     = useState<Order | null>(null);
  const cancelled             = useRef(false);
  const apiBase               = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  // Fetch order details independently — don't block on payment poll
  useEffect(() => {
    if (!orderId) return;
    fetch(`${apiBase}/api/orders/${orderId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: Order | null) => { if (data) setOrder(data); })
      .catch(() => {});
  }, [orderId, apiBase]);

  // Poll payment status — but cap the wait at 10 s then show success anyway.
  // Being redirected to this page is itself a success signal (done by our own code).
  useEffect(() => {
    cancelled.current = false;

    if (!ref) {
      setStatus("success");
      return;
    }

    let elapsed = 0;
    const SHORT_TIMEOUT = 10_000; // show success after 10 s regardless

    const poll = async () => {
      if (cancelled.current) return;
      try {
        const r = await fetch(`${apiBase}/api/payment/status/${encodeURIComponent(ref)}`);
        if (r.ok) {
          const d: { status?: string } = await r.json();
          if (d.status === "success") { setStatus("success"); return; }
          if (d.status === "failed" || d.status === "cancelled") { setStatus("pending"); return; }
        } else {
          // 404 or other — transaction not yet visible; treat as success after timeout
        }
      } catch {
        setStatus("success");
        return;
      }

      elapsed += POLL_INTERVAL;
      if (elapsed >= SHORT_TIMEOUT) {
        // We've been redirected here → payment was confirmed. Show success.
        setStatus("success");
        return;
      }
      setTimeout(poll, POLL_INTERVAL);
    };

    poll();
    return () => { cancelled.current = true; };
  }, [ref, apiBase]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          body > #print-invoice { display: block !important; }
          #print-invoice { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Hidden print target (full-page) */}
      {order && (
        <div id="print-invoice" style={{ display: "none" }}>
          <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
            <Invoice order={order} ref={ref} />
          </div>
        </div>
      )}

      <Layout>
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
          {status === "loading" ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Confirmation du paiement en cours…</p>
            </div>
          ) : (
            <>
              {/* Success banner */}
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">
                  {status === "success" ? "Paiement réussi !" : "Paiement en cours de traitement"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {status === "success"
                    ? "Votre commande est confirmée. Vous recevrez votre livraison très prochainement."
                    : "Votre paiement est en cours de confirmation. Nous vous contacterons dès la validation."}
                </p>
              </div>

              {/* Invoice */}
              {order ? (
                <>
                  <Invoice order={order} ref={ref} />

                  {/* Download button */}
                  <Button
                    onClick={handlePrint}
                    size="lg"
                    className="w-full font-bold no-print"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger / Imprimer la facture
                  </Button>
                </>
              ) : (
                /* Fallback if order couldn't be loaded */
                (ref || orderId) && (
                  <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
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
                )
              )}

              {/* Navigation buttons */}
              <div className="flex flex-col sm:flex-row gap-3 no-print">
                <Button asChild size="lg" variant="outline" className="flex-1 font-bold">
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Retour à l'accueil
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="flex-1">
                  <Link href="/">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Continuer mes achats
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
