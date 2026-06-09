import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated === false) {
      setLocation("/admin/login");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-white/60 text-sm animate-pulse">Vérification...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
