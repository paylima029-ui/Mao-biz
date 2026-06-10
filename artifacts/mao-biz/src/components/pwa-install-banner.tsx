import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";

const DISMISSED_KEY = "mao-pwa-banner-dismissed";

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Show after 4 seconds of browsing
    const timer = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timer);
  }, [canInstall]);

  if (!visible) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await install();
    if (accepted) setVisible(false);
    setInstalling(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 md:left-auto md:right-4 md:bottom-6 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-secondary text-secondary-foreground rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-primary via-orange-400 to-primary" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-2xl font-black text-white leading-none">M</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-base leading-tight">Installer MAO-BIZ</p>
                  <p className="text-white/60 text-xs mt-0.5">Application gratuite</p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white/40 hover:text-white/80 transition-colors shrink-0 mt-0.5"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-white/70 text-xs mt-2 leading-relaxed">
                Installez l'appli pour un accès rapide, même sans internet.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-9 gap-1.5"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? (
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 animate-pulse" /> Installation...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Installer
                    </span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl h-9 text-xs"
                  onClick={handleDismiss}
                >
                  Plus tard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
