import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";

function parseSearch(search: string) {
  const p = new URLSearchParams(search);
  return {
    category:  p.get("category")  ?? undefined,
    featured:  p.get("featured")  === "true" ? true : undefined,
    isNew:     p.get("isNew")     === "true" ? true : undefined,
    onSale:    p.get("onSale")    === "true" ? true : undefined,
    q:         p.get("q")         ?? "",
  };
}

export default function Products() {
  const [location, setLocation] = useLocation();
  const search = location.includes("?") ? location.split("?")[1] : "";
  const filters = useMemo(() => parseSearch(search), [search]);

  const [searchInput, setSearchInput] = useState(filters.q);

  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts({
    category: filters.category,
    featured: filters.featured,
    isNew:    filters.isNew,
    onSale:   filters.onSale,
    search:   filters.q || undefined,
  });

  function setFilter(key: string, value: string | undefined) {
    const p = new URLSearchParams(search);
    if (value) p.set(key, value);
    else p.delete(key);
    const qs = p.toString();
    setLocation(`/products${qs ? `?${qs}` : ""}`);
  }

  function clearFilters() {
    setSearchInput("");
    setLocation("/products");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilter("q", searchInput || undefined);
  }

  const hasFilters = !!(filters.category || filters.featured || filters.isNew || filters.onSale || filters.q);

  const pageTitle = filters.category
    ? (categories?.find(c => c.slug === filters.category)?.name ?? filters.category)
    : filters.featured ? "Populaires"
    : filters.isNew    ? "Nouveautés"
    : filters.onSale   ? "Promotions"
    : filters.q        ? `"${filters.q}"`
    : "Tous les produits";

  return (
    <Layout>
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">{pageTitle}</h1>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Effacer
            </Button>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher un produit..."
              className="pl-9 h-11"
            />
          </div>
          <Button type="submit" variant="outline" size="icon" className="h-11 w-11 shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={!filters.category ? "default" : "outline"}
              size="sm"
              className="rounded-full font-semibold"
              onClick={() => setFilter("category", undefined)}
            >
              Tout
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={filters.category === cat.slug ? "default" : "outline"}
                size="sm"
                className="rounded-full font-semibold"
                onClick={() => setFilter("category", filters.category === cat.slug ? undefined : cat.slug)}
              >
                <span className="mr-1">{cat.icon}</span>{cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: "⭐ Populaires", key: "featured", val: "true" },
            { label: "✨ Nouveautés", key: "isNew",    val: "true" },
            { label: "🔥 Promos",     key: "onSale",   val: "true" },
          ].map(({ label, key, val }) => {
            const active = (filters as Record<string, unknown>)[key] === true;
            return (
              <Button
                key={key}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full text-sm border"
                onClick={() => setFilter(key, active ? undefined : val)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-lg" />
            ))}
          </div>
        ) : !products?.length ? (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-semibold">Aucun produit trouvé</p>
            {hasFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Voir tous les produits
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {products.length} produit{products.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
