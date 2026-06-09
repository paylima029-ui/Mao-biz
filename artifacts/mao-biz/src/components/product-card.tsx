import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      unitPrice: product.price,
    });
    toast({
      title: "Ajouté au panier",
      description: `${product.name} a été ajouté à votre panier.`,
    });
  };

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full overflow-hidden hover-elevate transition-all border-none shadow-sm flex flex-col group cursor-pointer">
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {product.isNew && (
            <Badge className="absolute top-2 left-2 z-10 bg-secondary text-secondary-foreground">Nouveau</Badge>
          )}
          {product.onSale && (
            <Badge className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground">-PROMO</Badge>
          )}
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">{product.categorySlug}</p>
          <h3 className="font-bold text-base leading-tight mb-2 line-clamp-2">{product.name}</h3>
          <div className="mt-auto flex items-center gap-2">
            <span className="font-bold text-lg text-primary">{product.price.toLocaleString()} FCFA</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">{product.originalPrice.toLocaleString()} FCFA</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button onClick={handleAddToCart} className="w-full gap-2 font-bold" variant={product.isFeatured ? "default" : "secondary"}>
            <ShoppingCart className="h-4 w-4" />
            Ajouter
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
