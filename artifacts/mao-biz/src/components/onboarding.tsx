import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ChevronRight, X, ShoppingBag, CreditCard, Truck, Star, Sparkles } from "lucide-react";

const ONBOARDING_KEY = "mao-onboarding-done";

interface Step {
  id: number;
  emoji: string;
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  bg: string;
  features?: { icon: string; text: string }[];
}

const STEPS: Step[] = [
  {
    id: 0,
    emoji: "🛍️",
    title: "Bienvenue sur MAO-BIZ",
    subtitle: "Le marché dans votre poche",
    description: "Découvrez des milliers de produits livrés directement chez vous, en toute sécurité.",
    accent: "#f97316",
    bg: "from-secondary via-secondary to-secondary/90",
    features: [
      { icon: "⚡", text: "Livraison rapide" },
      { icon: "🔒", text: "Paiement sécurisé" },
      { icon: "💯", text: "Produits de qualité" },
    ],
  },
  {
    id: 1,
    emoji: "🔍",
    title: "Explorez nos produits",
    subtitle: "Tout ce dont vous avez besoin",
    description: "Parcourez nos catégories — mode, accessoires, parfums, chaussures et bien plus encore.",
    accent: "#3b82f6",
    bg: "from-blue-900 via-blue-800 to-blue-900",
    features: [
      { icon: "👗", text: "Mode & Tendances" },
      { icon: "💍", text: "Bijoux & Accessoires" },
      { icon: "👟", text: "Chaussures" },
    ],
  },
  {
    id: 2,
    emoji: "🛒",
    title: "Ajoutez au panier",
    subtitle: "Simple et rapide",
    description: "En un seul clic, ajoutez vos articles au panier et continuez vos achats sans interruption.",
    accent: "#10b981",
    bg: "from-emerald-900 via-emerald-800 to-emerald-900",
    features: [
      { icon: "➕", text: "Ajout en un clic" },
      { icon: "🔢", text: "Quantités modifiables" },
      { icon: "🗑️", text: "Suppression facile" },
    ],
  },
  {
    id: 3,
    emoji: "📱",
    title: "Payez par mobile money",
    subtitle: "Votre portefeuille mobile accepté",
    description: "Réglez en toute sécurité avec votre téléphone. Nous acceptons tous les opérateurs.",
    accent: "#8b5cf6",
    bg: "from-purple-900 via-purple-800 to-purple-900",
    features: [
      { icon: "🌊", text: "Wave" },
      { icon: "🟠", text: "Orange Money" },
      { icon: "🟣", text: "Free Money" },
    ],
  },
  {
    id: 4,
    emoji: "🚀",
    title: "Livraison chez vous",
    subtitle: "Rapide, partout au Sénégal",
    description: "Choisissez votre zone de livraison et recevez votre commande rapidement à l'adresse de votre choix.",
    accent: "#f97316",
    bg: "from-secondary via-secondary to-secondary/90",
    features: [
      { icon: "📍", text: "Partout au Sénégal" },
      { icon: "⏱️", text: "Délai rapide" },
      { icon: "📦", text: "Suivi de commande" },
    ],
  },
];

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [, setLocation] = useLocation();
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the app loads first
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(ONBOARDING_KEY, "1");
      setVisible(false);
    }, 300);
  };

  const next = () => {
    if (isLast) { close(); return; }
    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const delta = e.changedTouches[0].clientX - startXRef.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    startXRef.current = null;
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end md:items-center justify-center transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Card */}
      <div
        className={`relative w-full md:max-w-sm md:mx-4 md:rounded-3xl overflow-hidden shadow-2xl transition-transform duration-300 ${exiting ? "translate-y-8 md:scale-95" : "translate-y-0 md:scale-100"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${current.bg}`} />

        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative z-10 px-6 pt-8 pb-10">
          {/* Skip button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1"
            aria-label="Passer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-6 h-2 bg-primary"
                    : i < step
                    ? "w-2 h-2 bg-white/50"
                    : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Big emoji */}
          <div className="text-center mb-6">
            <div
              className="text-7xl mb-4 inline-block animate-in zoom-in-50 duration-500"
              key={step}
            >
              {current.emoji}
            </div>
            <div
              className="animate-in slide-in-from-bottom-2 duration-400"
              key={`title-${step}`}
            >
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
                {current.subtitle}
              </p>
              <h2 className="text-white text-2xl font-extrabold leading-tight">
                {current.title}
              </h2>
              <p className="text-white/60 text-sm mt-3 leading-relaxed">
                {current.description}
              </p>
            </div>
          </div>

          {/* Feature pills */}
          {current.features && (
            <div
              className="flex flex-col gap-2 mb-8 animate-in slide-in-from-bottom-2 duration-500"
              key={`features-${step}`}
            >
              {current.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
                >
                  <span className="text-xl shrink-0">{f.icon}</span>
                  <span className="text-white/90 text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          {isLast ? (
            <div className="space-y-3">
              <Button
                className="w-full h-13 bg-primary hover:bg-primary/90 text-white font-black text-base rounded-2xl shadow-lg shadow-primary/30"
                onClick={() => { close(); setLocation("/products"); }}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Commencer mes achats
              </Button>
              <Button
                variant="ghost"
                className="w-full text-white/50 hover:text-white hover:bg-white/10 rounded-2xl text-sm"
                onClick={close}
              >
                Explorer d'abord
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-13 bg-white/15 hover:bg-white/25 text-white font-bold text-base rounded-2xl border border-white/20 backdrop-blur-sm"
              onClick={next}
            >
              Suivant
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          )}

          {/* Step counter */}
          <p className="text-center text-white/30 text-xs mt-4">
            {step + 1} / {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}
