import { useGetAdminStats } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, AlertTriangle, ListOrdered, LogOut, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, username } = useAuth();
  const [, setLocation] = useLocation();

  async function handleLogout() {
    await logout();
    setLocation("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-secondary text-secondary-foreground shadow-xl shrink-0 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black text-primary tracking-tight">MAO-BIZ Admin</h1>
          {username && (
            <p className="text-white/50 text-xs mt-1">Connecté : {username}</p>
          )}
        </div>
        <nav className="flex md:flex-col gap-2 px-4 py-4 overflow-x-auto md:overflow-visible flex-1">
          <Link href="/admin">
            <span className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap font-medium">
              <DollarSign className="h-5 w-5 text-primary" /> Dashboard
            </span>
          </Link>
          <Link href="/admin/orders">
            <span className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap font-medium">
              <ShoppingCart className="h-5 w-5 text-primary" /> Commandes
            </span>
          </Link>
          <Link href="/admin/products">
            <span className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap font-medium">
              <Package className="h-5 w-5 text-primary" /> Produits
            </span>
          </Link>
          <Link href="/admin/delivery-zones">
            <span className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap font-medium">
              <MapPin className="h-5 w-5 text-primary" /> Zones de livraison
            </span>
          </Link>
          <Link href="/">
            <span className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap font-medium opacity-70">
              <ListOrdered className="h-5 w-5" /> Voir la boutique
            </span>
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10 md:block hidden">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer w-full text-left font-medium text-red-400 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" /> Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Mobile logout bar */}
        <div className="flex justify-end mb-4 md:hidden">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 font-semibold px-3 py-2 rounded-lg border border-red-200 bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading || !stats) {
    return (
      <AdminLayout>
        <h2 className="text-3xl font-bold mb-8">Tableau de bord</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl shadow-sm border animate-pulse"></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h2 className="text-3xl font-bold mb-8 text-secondary">Aujourd'hui</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="border-none shadow-md bg-gradient-to-br from-primary to-[#ff8c42] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Chiffre d'Affaires</CardTitle>
            <DollarSign className="h-5 w-5 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.todayRevenue.toLocaleString()} F</div>
            <p className="text-xs mt-1 opacity-80">+15% par rapport à hier</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commandes du Jour</CardTitle>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-secondary">{stats.todayOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produits Vendus</CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-secondary">{stats.totalProductsSold}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-destructive/5 border-destructive/20 border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Stock Faible</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-destructive">{stats.lowStockCount}</div>
            <p className="text-xs mt-1 text-destructive/80">Produits à réapprovisionner</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-bold mb-6 text-secondary">Statut des Commandes Globales</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">En attente</p>
            <p className="text-2xl font-bold text-orange-500">{stats.pendingOrders}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Confirmées</p>
            <p className="text-2xl font-bold text-blue-500">{stats.confirmedOrders}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Livrées</p>
            <p className="text-2xl font-bold text-green-500">{stats.deliveredOrders}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
