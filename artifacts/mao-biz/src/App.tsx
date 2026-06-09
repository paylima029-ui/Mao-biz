import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { AdminRoute } from "@/components/admin-route";
import { setBaseUrl } from "@workspace/api-client-react";

// Point the API client to the right server (empty string = relative, fine for local dev behind proxy)
setBaseUrl(import.meta.env.VITE_API_URL ?? "");

// Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ProductDetails from "@/pages/product";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Products from "@/pages/products";
import OrderConfirmation from "@/pages/order-confirmation";
import PaymentSuccess from "@/pages/payment-success";
import PaymentError from "@/pages/payment-error";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminDeliveryZones from "@/pages/admin/delivery-zones";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetails} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation/:id" component={OrderConfirmation} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-error" component={PaymentError} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>
      <Route path="/admin/products">
        <AdminRoute>
          <AdminProducts />
        </AdminRoute>
      </Route>
      <Route path="/admin/orders">
        <AdminRoute>
          <AdminOrders />
        </AdminRoute>
      </Route>
      <Route path="/admin/delivery-zones">
        <AdminRoute>
          <AdminDeliveryZones />
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
