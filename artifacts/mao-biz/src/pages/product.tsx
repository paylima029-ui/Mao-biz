import { useGetProduct } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { useLocation, Link, useParams } from "wouter";
import { useState } from "react";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useGetProduct(Number(id));
  const { addItem } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
      quantity
    });
    toast({
      title: "Ajouté au panier",
      description: `${quantity}x ${product.name} ajouté à votre panier.`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setLocation('/checkout');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8">
          <Skeleton className="h-8 w-24 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full mt-8" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Produit introuvable</h1>
          <Button asChild><Link href="/">Retour à l'accueil</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-4 md:py-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border">
            {product.isNew && (
              <Badge className="absolute top-4 left-4 z-10 bg-secondary text-secondary-foreground text-sm px-3 py-1">Nouveau</Badge>
            )}
            {product.onSale && (
              <Badge className="absolute top-4 right-4 z-10 bg-destructive text-destructive-foreground text-sm px-3 py-1">-PROMO</Badge>
            )}
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="object-cover w-full h-full"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-sm font-bold text-primary tracking-wider uppercase mb-2">{product.categorySlug}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">{product.name}</h1>
            
            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-black text-primary">{product.price.toLocaleString()} FCFA</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xl text-muted-foreground line-through mb-1">{product.originalPrice.toLocaleString()} FCFA</span>
              )}
            </div>

            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-border mb-8">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary"><ShieldCheck className="h-6 w-6" /></div>
                <span className="text-xs font-semibold">Paiement Sécurisé</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary"><Truck className="h-6 w-6" /></div>
                <span className="text-xs font-semibold">Livraison Rapide</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-primary/10 p-3 rounded-full text-primary"><RotateCcw className="h-6 w-6" /></div>
                <span className="text-xs font-semibold">Retour 48h</span>
              </div>
            </div>

            <div className="mt-auto hidden md:flex flex-col gap-4">
              <p className="text-sm font-medium">
                Disponibilité: <span className={product.stock > 0 ? "text-green-600 font-bold" : "text-destructive font-bold"}>
                  {product.stock > 0 ? `En stock (${product.stock})` : "Rupture de stock"}
                </span>
              </p>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-input rounded-md h-12">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 h-full flex items-center justify-center hover:bg-muted font-bold"
                  >-</button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 h-full flex items-center justify-center hover:bg-muted font-bold"
                  >+</button>
                </div>
                <Button 
                  size="lg" 
                  className="flex-1 h-12 font-bold text-lg" 
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  variant="secondary"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> Ajouter
                </Button>
                <Button 
                  size="lg" 
                  className="flex-1 h-12 font-bold text-lg" 
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                >
                  Commander direct
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50 flex gap-3">
        <Button 
          size="lg" 
          variant="secondary"
          className="flex-1 font-bold" 
          onClick={handleAddToCart}
          disabled={product.stock === 0}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
        </Button>
        <Button 
          size="lg" 
          className="flex-[2] font-bold text-base" 
          onClick={handleBuyNow}
          disabled={product.stock === 0}
        >
          Acheter Maintenant
        </Button>
      </div>
    </Layout>
  );
}
