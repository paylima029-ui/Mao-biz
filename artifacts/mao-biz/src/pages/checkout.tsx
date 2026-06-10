import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ShieldCheck, HandCoins, Smartphone, Wifi, Zap, MapPin, Loader2, User, Phone, Home } from "lucide-react";
import { useCreateOrder, useListDeliveryZones } from "@workspace/api-client-react";
import type { DeliveryZone } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const checkoutSchema = z.object({
  customerName:         z.string().min(2, "Nom trop court"),
  customerPhone:        z.string().min(8, "Numéro invalide"),
  customerPhone2:       z.string().optional(),
  customerCity:         z.string().min(2, "Ville requise"),
  customerNeighborhood: z.string().min(2, "Quartier/Commune requis"),
  customerAddress:      z.string().min(5, "Adresse trop courte"),
  paymentMethod: z.enum(["wave", "orange_money", "free_money", "expresso", "cash"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [redirecting, setRedirecting] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);

  const { data: deliveryZones = [], isLoading: loadingZones } = useListDeliveryZones();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName:         "",
      customerPhone:        "",
      customerPhone2:       "",
      customerCity:         "",
      customerNeighborhood: "",
      customerAddress:      "",
      paymentMethod:        "wave",
    },
  });

  // Reset form on every mount to prevent showing previous customer's data
  useEffect(() => {
    form.reset({
      customerName:         "",
      customerPhone:        "",
      customerPhone2:       "",
      customerCity:         "",
      customerNeighborhood: "",
      customerAddress:      "",
      paymentMethod:        "wave",
    });
    setSelectedZone(null);
  }, []);

  if (items.length === 0) {
    setLocation('/cart');
    return null;
  }

  const deliveryFee = selectedZone ? Number(selectedZone.price) : 0;
  const grandTotal  = total + deliveryFee;

  // Build a full address string from the structured fields
  const buildFullAddress = (data: CheckoutFormValues) => {
    const parts = [data.customerNeighborhood, data.customerCity, data.customerAddress].filter(Boolean);
    const phone2 = data.customerPhone2 ? ` | Tél2: ${data.customerPhone2}` : "";
    return parts.join(", ") + phone2;
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    const fullAddress = buildFullAddress(data);
    const orderItems = items.map(item => ({
      productId:       item.productId,
      productName:     item.productName,
      productImageUrl: item.productImageUrl,
      quantity:        item.quantity,
      unitPrice:       item.unitPrice,
    }));

    // Cash / paiement à la livraison
    if (data.paymentMethod === "cash") {
      createOrder.mutate({
        data: {
          customerName:    data.customerName,
          customerPhone:   data.customerPhone,
          customerAddress: fullAddress,
          paymentMethod:   data.paymentMethod,
          items:           orderItems,
          deliveryZoneId:  selectedZone?.id   ?? null,
          deliveryZoneName: selectedZone?.name ?? null,
          deliveryFee:     deliveryFee,
        }
      }, {
        onSuccess: (order) => { clearCart(); setLocation(`/order-confirmation/${order.id}`); },
        onError:   () => toast({ title: "Erreur", description: "Impossible de créer la commande.", variant: "destructive" }),
      });
      return;
    }

    // Mobile money — appel combiné (commande + paiement en 1 requête)
    setRedirecting(true);
    setProgressStep("Création de la commande…");
    try {
      const res = await fetch(`${apiBase}/api/payment/checkout`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:    data.customerName,
          customerPhone:   data.customerPhone,
          customerAddress: fullAddress,
          paymentMethod:   data.paymentMethod,
          items:           orderItems,
          deliveryZoneId:  selectedZone?.id   ?? null,
          deliveryZoneName: selectedZone?.name ?? null,
          deliveryFee:     deliveryFee,
        }),
      });
      const result = await res.json();

      if (res.ok && result.paymentUrl) {
        clearCart();
        setProgressStep("Redirection vers le paiement…");
        window.location.href = result.paymentUrl;
      } else {
        toast({ title: "Paiement impossible", description: result?.error ?? "Échec du paiement en ligne.", variant: "destructive" });
        setRedirecting(false);
        setProgressStep("");
      }
    } catch {
      toast({ title: "Erreur réseau", description: "Impossible de joindre le service de paiement. Veuillez réessayer.", variant: "destructive" });
      setRedirecting(false);
      setProgressStep("");
    }
  };

  const paymentMethod = form.watch("paymentMethod");
  const isPending = createOrder.isPending || redirecting;

  return (
    <Layout>
      <div className="px-4 py-6 md:py-10 max-w-5xl mx-auto">
        <Link href="/cart" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour au panier
        </Link>

        <h1 className="text-2xl md:text-3xl font-extrabold mb-6">Finaliser la commande</h1>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Form */}
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Customer info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-bold mb-5 border-b pb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Vos informations
                  </h2>
                  <div className="space-y-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Nom complet <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom Nom" className="h-12 bg-muted/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="customerPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Téléphone principal <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="77 XXX XX XX" className="h-12 bg-muted/50 pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="customerPhone2" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-muted-foreground">2ème numéro</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Optionnel" className="h-12 bg-muted/50 pl-9" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Delivery address */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-bold mb-5 border-b pb-3 flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" /> Adresse de livraison
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="customerCity" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Ville / Région <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Dakar, Thiès…" className="h-12 bg-muted/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="customerNeighborhood" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Quartier / Commune <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Plateau, Medina…" className="h-12 bg-muted/50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="customerAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Adresse précise / Repère <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Numéro de rue, immeuble, repère visible (kiosque, école, mosquée…)"
                            className="bg-muted/50 min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Delivery zone selector */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-bold mb-5 border-b pb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Zone de livraison
                  </h2>
                  {loadingZones ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Chargement des zones...
                    </div>
                  ) : deliveryZones.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Aucune zone définie — livraison à négocier.</p>
                  ) : (
                    <div className="space-y-3">
                      <label
                        className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          selectedZone === null ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedZone(null)}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedZone === null ? "border-primary" : "border-border"}`}>
                          {selectedZone === null && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">À définir</p>
                          <p className="text-xs text-muted-foreground">Je précise ma zone plus tard</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">—</span>
                      </label>

                      {deliveryZones.map((zone) => (
                        <label
                          key={zone.id}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                            selectedZone?.id === zone.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedZone(zone)}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedZone?.id === zone.id ? "border-primary" : "border-border"}`}>
                            {selectedZone?.id === zone.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{zone.name}</p>
                            {zone.description && <p className="text-xs text-muted-foreground truncate">{zone.description}</p>}
                          </div>
                          <span className="text-sm font-black text-primary shrink-0">
                            {Number(zone.price) === 0 ? (
                              <span className="text-green-600">Gratuit</span>
                            ) : (
                              `${Number(zone.price).toLocaleString()} F`
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <h2 className="text-lg font-bold mb-5 border-b pb-3">Mode de paiement</h2>
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                          {[
                            { value: "wave",         label: "Wave",           sub: "Paiement mobile Wave",     color: "bg-blue-500",   Icon: Wifi },
                            { value: "orange_money", label: "Orange Money",   sub: "Paiement mobile Orange",   color: "bg-orange-500", Icon: Smartphone },
                            { value: "free_money",   label: "Free Money",     sub: "Paiement mobile Free",     color: "bg-purple-600", Icon: Zap },
                            { value: "expresso",     label: "Expresso Money", sub: "Paiement mobile Expresso", color: "bg-red-600",    Icon: Smartphone },
                          ].map(({ value, label, sub, color, Icon }) => (
                            <label key={value} className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                              <RadioGroupItem value={value} className="shrink-0" />
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{label}</p>
                                  <p className="text-xs text-muted-foreground">{sub}</p>
                                </div>
                              </div>
                              {field.value === value && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />}
                            </label>
                          ))}

                          <label className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === 'cash' ? 'border-secondary bg-secondary/5' : 'border-border hover:border-secondary/50'}`}>
                            <RadioGroupItem value="cash" className="shrink-0" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <HandCoins className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">Paiement à la livraison</p>
                                <p className="text-xs text-muted-foreground">Payez en cash à la réception</p>
                              </div>
                            </div>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {paymentMethod !== 'cash' && (
                    <div className="mt-4 bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2 text-xs">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Paiement sécurisé via <strong>DiamanoPay</strong> — Vous serez redirigé pour finaliser.</span>
                    </div>
                  )}
                </div>

                {/* Submit desktop */}
                <div className="hidden lg:block">
                  <Button type="submit" size="lg" className="w-full h-14 font-black text-lg text-white" disabled={isPending}>
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {progressStep || "Traitement…"}
                      </span>
                    ) : (
                      paymentMethod === 'cash' ? "Confirmer la commande" : "Payer avec Diamanopay"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-secondary text-secondary-foreground p-6 rounded-xl shadow-sm sticky top-20">
              <h2 className="text-lg font-bold mb-5">Votre commande</h2>
              <div className="space-y-3 mb-5 max-h-[35vh] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 items-center">
                    <img src={item.productImageUrl} alt={item.productName} className="w-14 h-14 object-cover rounded-lg bg-white/10 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm line-clamp-1">{item.productName}</p>
                      <p className="text-white/60 text-xs">Qté: {item.quantity} × {item.unitPrice.toLocaleString()} F</p>
                    </div>
                    <span className="font-bold text-sm shrink-0">{(item.unitPrice * item.quantity).toLocaleString()} F</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/20 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Sous-total</span>
                  <span className="text-white">{total.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-sm text-white/70">
                  <span>Livraison {selectedZone ? `(${selectedZone.name})` : ""}</span>
                  {deliveryFee === 0 ? (
                    <span className="text-green-400 font-bold">Gratuit</span>
                  ) : (
                    <span className="text-white">{deliveryFee.toLocaleString()} FCFA</span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/20">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-black text-primary">{grandTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky submit */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          size="lg"
          className="w-full h-14 font-black text-lg text-white"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {progressStep || "Traitement…"}
            </span>
          ) : (
            paymentMethod === 'cash' ? "Confirmer la commande" : "Payer avec Diamanopay"
          )}
        </Button>
      </div>
    </Layout>
  );
}
