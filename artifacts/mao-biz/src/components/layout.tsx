import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, Search, X, Package } from 'lucide-react';
import { useCart } from '@/lib/cart';

export function Layout({ children }: { children: React.ReactNode }) {
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
        {/* Top bar */}
        <div className="px-4 h-14 flex items-center gap-3 max-w-7xl mx-auto w-full">
          {/* Logo */}
          <Link href="/" className="text-xl font-black tracking-tight shrink-0 mr-1">
            MAO-BIZ
          </Link>

          {/* Search bar — always visible */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-white/15 hover:bg-white/20 transition-colors rounded-full px-3 h-9 gap-2">
            <Search className="h-4 w-4 opacity-80 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des produits..."
              className="bg-transparent border-none outline-none text-white placeholder:text-white/60 w-full text-sm"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="shrink-0">
                <X className="h-3.5 w-3.5 opacity-70" />
              </button>
            )}
          </form>

          {/* My orders */}
          <Link href="/mes-commandes" className="p-1.5 shrink-0" title="Mes commandes">
            <Package className="h-6 w-6" />
          </Link>

          {/* Cart icon */}
          <Link href="/cart" className="relative p-1.5 shrink-0">
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-white text-primary text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full leading-none">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto pb-24 md:pb-8">
        {children}
      </main>

      <footer className="bg-secondary text-secondary-foreground py-8 text-center text-sm">
        <div className="container mx-auto px-4">
          <p className="font-bold text-base mb-1">MAO-BIZ</p>
          <p className="opacity-60 text-xs">La meilleure boutique e-commerce africaine.</p>
          <div className="mt-4">
            <Link href="/admin" className="opacity-40 hover:opacity-80 transition-opacity text-xs">
              Administration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
