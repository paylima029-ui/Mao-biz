import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Trash2, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Cart() {
  const { items, updateQuantity, removeItem, total, itemCount } = useCart();
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="bg-primary/10 p-6 rounded-full text-primary mb-6">
            <ShoppingBag className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
          <p className="text-muted-foreground mb-8">Découvrez nos produits populaires et commencez vos achats.</p>
          <Button asChild size="lg" className="rounded-full px-8 font-bold">
            <Link href="/">Commencer mes achats</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 md:py-10">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-8 flex items-center gap-3">
          Mon Panier <span className="bg-primary text-white text-sm py-1 px-3 rounded-full">{itemCount} articles</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border relative">
                <img 
                  src={item.productImageUrl} 
                  alt={item.productName} 
                  className="w-24 h-24 object-cover rounded-lg bg-muted"
                />
                <div className="flex flex-col flex-1 justify-between py-1">
                  <div className="flex justify-between items-start pr-8">
                    <h3 className="font-bold text-base leading-tight line-clamp-2">{item.productName}</h3>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Prix unitaire : {item.unitPrice.toLocaleString()} FCFA
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-md">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted font-bold"
                      >-</button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted font-bold"
                      >+</button>
                    </div>
                    <div className="font-extrabold text-primary text-base">
                      {(item.unitPrice * item.quantity).toLocaleString()} FCFA
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeItem(item.productId)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-2"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Récapitulatif</h2>
              
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-semibold">{total.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-semibold text-green-600">Calculée à l'étape suivante</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-end">
                  <span className="font-bold text-base">Total</span>
                  <span className="text-2xl font-black text-primary">{total.toLocaleString()} FCFA</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full font-bold text-base py-6 rounded-xl"
                onClick={() => setLocation('/checkout')}
              >
                Passer la commande
              </Button>
              
              <div className="mt-4 text-center">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
