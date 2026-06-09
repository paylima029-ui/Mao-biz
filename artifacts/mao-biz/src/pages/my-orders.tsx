import { useState } from "react";
import { Link } from "wouter";
import { Package, Phone, ChevronRight, Clock, CheckCircle2, XCircle, Truck, AlertCircle, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:            { label: "En attente",        color: "bg-yellow-100 text-yellow-800",  icon: <Clock className="h-3.5 w-3.5" /> },
  payment_initiated:  { label: "Paiement initié",   color: "bg-blue-100 text-blue-800",      icon: <Clock className="h-3.5 w-3.5" /> },
  confirmed:          { label: "Confirmée",          color: "bg-green-100 text-green-800",    icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  processing:         { label: "En préparation",     color: "bg-purple-100 text-purple-800",  icon: <Package className="h-3.5 w-3.5" /> },
  shipped:            { label: "Expédiée",           color: "bg-indigo-100 text-indigo-800",  icon: <Truck className="h-3.5 w-3.5" /> },
  delivered:          { label: "Livrée",             color: "bg-green-100 text-green-800",    icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  cancelled:          { label: "Annulée",            color: "bg-red-100 text-red-800",        icon: <XCircle className="h-3.5 w-3.5" /> },
};

const PAYMENT_LABELS: Record<string, string> = {
  wave:          "Wave",
  orange_money:  "Orange Money",
  free_money:    "Free Money",
  expresso:      "Expresso",
  cod:           "Paiement à la livraison",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function formatPrice(n: number) {
  return n.toLocaleString("fr-FR") + " FCFA";
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function MyOrders() {
  const [phone, setPhone]       = useState("");
  const [submitted, setSubmitted] = useState("");
  const [orders, setOrders]     = useState<Order[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = phone.trim().replace(/\s/g, "");
    if (!normalized) return;

    setLoading(true);
    setError("");
    setOrders(null);
    setSubmitted(normalized);

    try {
      const r = await fetch(`${apiBase}/api/orders/my-orders?phone=${encodeURIComponent(normalized)}`);
      if (!r.ok) throw new Error("Erreur serveur");
      const data: Order[] = await r.json();
      setOrders(data.slice().reverse()); // newest first
    } catch {
      setError("Impossible de récupérer vos commandes. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mes commandes</h1>
          <p className="text-muted-foreground text-sm">
            Entrez le numéro de téléphone utilisé lors de la commande.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="ex : 77 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="font-bold">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Recherche…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Search className="h-4 w-4" />
                Rechercher
              </span>
            )}
          </Button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {orders !== null && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <p className="font-semibold text-gray-700">Aucune commande trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Aucune commande associée au numéro <strong>{submitted}</strong>.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {orders.length} commande{orders.length > 1 ? "s" : ""} trouvée{orders.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link key={order.id} href={`/order-confirmation/${order.id}`}>
                      <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 space-y-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={order.status} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>

                        {/* Items summary */}
                        <div className="text-sm text-gray-700">
                          {order.items.slice(0, 2).map((item, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              {item.quantity}× {item.productName}
                            </span>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-muted-foreground"> +{order.items.length - 2} autre{order.items.length - 2 > 1 ? "s" : ""}</span>
                          )}
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="text-xs text-muted-foreground">
                            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                          </span>
                          <span className="font-extrabold text-primary">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
