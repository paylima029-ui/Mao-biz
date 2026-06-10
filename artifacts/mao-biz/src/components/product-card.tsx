import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toast } = useToast();

  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId:       product.id,
      productName:     product.name,
      productImageUrl: product.imageUrl,
      unitPrice:       product.price,
    });
    toast({ title: "Ajouté au panier", description: product.name });
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg overflow-hidden cursor-pointer active:scale-[.98] transition-transform shadow-sm border border-gray-100">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {/* Discount badge top-left */}
          {discountPct && (
            <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              -{discountPct}%
            </span>
          )}
          {/* New badge */}
          {product.isNew && !discountPct && (
            <span className="absolute top-1.5 left-1.5 bg-secondary text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              Nouveau
            </span>
          )}
          {/* Cart button bottom-right */}
          <button
            onClick={handleAddToCart}
            className="absolute bottom-1.5 right-1.5 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md active:scale-90 transition-transform"
            aria-label="Ajouter au panier"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info */}
        <div className="px-2 pt-1.5 pb-2">
          <p className="text-[12px] leading-tight text-gray-700 line-clamp-2 mb-1 min-h-[2rem]">
            {product.name}
          </p>
          <p className="text-[13px] font-extrabold text-gray-900">
            {product.price.toLocaleString()} FCFA
          </p>
          {product.originalPrice && product.originalPrice > product.price && (
            <p className="text-[11px] text-gray-400 line-through leading-none mt-0.5">
              {product.originalPrice.toLocaleString()} FCFA
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
