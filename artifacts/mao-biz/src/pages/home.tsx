import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link, useLocation } from "wouter";
import { Badge, ChevronRight } from "lucide-react";

function ProductGrid({ products, loading }: { products: any[] | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
      </div>
    );
  }
  if (!products?.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {products.slice(0, 8).map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const { data: featuredProducts, isLoading: isLoadingFeatured } = useListProducts({ featured: true });
  const { data: saleProducts, isLoading: isLoadingSale } = useListProducts({ onSale: true });
  const { data: newProducts, isLoading: isLoadingNew } = useListProducts({ isNew: true });
  const { data: allProducts, isLoading: isLoadingAll } = useListProducts({});

  const hasFeatured = (featuredProducts?.length ?? 0) > 0;
  const hasSale = (saleProducts?.length ?? 0) > 0;
  const hasNew = (newProducts?.length ?? 0) > 0;
  const hasAny = (allProducts?.length ?? 0) > 0;
  const showAllFallback = hasAny && !hasFeatured && !hasSale && !hasNew;

  return (
    <Layout>
      {/* Hero */}
      <div className="w-full mb-8 relative bg-secondary overflow-hidden rounded-b-2xl md:rounded-2xl md:mt-4 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 to-secondary/40 z-10" />
        <img
          src="/images/hero-banner.png"
          alt="MAO-BIZ"
          className="w-full h-[250px] md:h-[400px] object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-12">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight">
            Le marché <span className="text-primary">dans</span><br />votre poche.
          </h1>
          <p className="text-white/80 mb-6 max-w-sm text-sm md:text-base">
            Les meilleurs produits, livrés chez vous rapidement et en toute sécurité.
          </p>
          <Link href="/products">
            <Button size="lg" className="w-fit font-bold rounded-full px-8">
              Acheter Maintenant
            </Button>
          </Link>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-10 px-4 md:px-0">
        <h2 className="text-xl font-bold mb-4">Catégories</h2>
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex w-max space-x-3">
            {isLoadingCategories
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-32 rounded-full" />)
              : categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    onClick={() => setLocation(`/products?category=${cat.slug}`)}
                    className="rounded-full px-6 font-semibold border-muted-foreground/20 hover:border-primary hover:text-primary"
                  >
                    <span className="mr-2">{cat.icon}</span>{cat.name}
                  </Button>
                ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* Fallback : tous les produits quand aucune section n'est remplie */}
      {showAllFallback && (
        <section className="mb-10 px-4 md:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Nos Produits</h2>
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-primary font-semibold">
                Voir tout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={allProducts} loading={isLoadingAll} />
        </section>
      )}

      {/* Populaires */}
      {(hasFeatured || isLoadingFeatured) && (
        <section className="mb-10 px-4 md:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Populaires</h2>
            <Link href="/products?featured=true">
              <Button variant="ghost" size="sm" className="text-primary font-semibold">
                Voir tout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={featuredProducts} loading={isLoadingFeatured} />
        </section>
      )}

      {/* Promotions */}
      {(hasSale || isLoadingSale) && (
        <section className="mb-10 px-4 md:px-0 bg-primary/5 rounded-2xl p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              Promotions <Badge className="bg-destructive hover:bg-destructive text-white">Chaud!</Badge>
            </h2>
          </div>
          <ProductGrid products={saleProducts} loading={isLoadingSale} />
        </section>
      )}

      {/* Nouveautés */}
      {(hasNew || isLoadingNew) && (
        <section className="mb-10 px-4 md:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Nouveautés ✨</h2>
            <Link href="/products?isNew=true">
              <Button variant="ghost" size="sm" className="text-primary font-semibold">
                Voir tout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={newProducts} loading={isLoadingNew} />
        </section>
      )}

      {/* Message si vraiment aucun produit */}
      {!isLoadingAll && !hasAny && (
        <section className="px-4 py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-4">🛍️</p>
          <p className="text-lg font-semibold">La boutique arrive bientôt !</p>
          <p className="text-sm mt-2">Revenez dans quelques instants.</p>
        </section>
      )}
    </Layout>
  );
}
