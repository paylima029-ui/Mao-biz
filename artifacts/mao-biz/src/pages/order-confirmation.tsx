import { useGetOrder } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useParams } from "wouter";
import { CheckCircle2, Package, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useGetOrder(Number(id));

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-4 py-12 flex flex-col items-center">
          <Skeleton className="h-24 w-24 rounded-full mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-12" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Commande introuvable</h1>
          <Button asChild><Link href="/">Retour à l'accueil</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6 shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Commande confirmée !</h1>
          <p className="text-lg text-muted-foreground">
            Merci pour votre confiance, <span className="font-bold text-foreground">{order.customerName}</span>.<br />
            Votre commande a été enregistrée avec succès.
          </p>
        </div>

        <Card className="border-none shadow-md overflow-hidden rounded-2xl mb-8">
          <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider mb-1">Numéro de commande</p>
              <p className="text-2xl font-black">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider mb-1">Total payé</p>
              <p className="text-2xl font-black">{order.total.toLocaleString()} FCFA</p>
            </div>
          </div>
          <CardContent className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-lg border-b pb-2">
                    <MapPin className="h-5 w-5 text-primary" /> Livraison
                  </h3>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-muted-foreground">{order.customerAddress}</p>
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-lg border-b pb-2">
                    <Phone className="h-5 w-5 text-primary" /> Contact
                  </h3>
                  <p className="font-medium">{order.customerPhone}</p>
                </div>
                <div>
                  <h3 className="font-bold mb-3 text-lg border-b pb-2">Paiement</h3>
                  <p className="font-medium capitalize flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    {order.paymentMethod === 'diamanopay' ? 'Diamanopay (Payé)' : 'À la livraison'}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/30 p-6 rounded-xl">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-lg border-b pb-2">
                  <Package className="h-5 w-5 text-primary" /> Articles ({order.items.length})
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <img src={item.productImageUrl} alt={item.productName} className="w-12 h-12 rounded object-cover border" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qté: {item.quantity} × {item.unitPrice.toLocaleString()} F</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild size="lg" className="h-14 px-10 font-bold rounded-full text-lg">
            <Link href="/">Continuer mes achats</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
