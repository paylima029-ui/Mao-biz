import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ShieldCheck, HandCoins, Smartphone, Wifi, Zap, MapPin, Loader2 } from "lucide-react";
import { useCreateOrder, useListDeliveryZones } from "@workspace/api-client-react";
import type { DeliveryZone } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const checkoutSchema = z.object({
  customerName:    z.string().min(2, "Nom trop court"),
  customerPhone:   z.string().min(8, "Numéro invalide"),
  customerAddress: z.string().min(5, "Adresse trop courte"),
  paymentMethod:   z.enum(["wave", "orange_money", "free_money", "expresso", "cash"]),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [redirecting, setRedirecting] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);

  const { data: deliveryZones = [], isLoading: loadingZones } = useListDeliveryZones();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName:    "",
      customerPhone:   "",
      customerAddress: "",
      paymentMethod:   "wave",
    },
  });

  if (items.length === 0) {
    setLocation('/cart');
    return null;
  }

  const deliveryFee = selectedZone ? Number(selectedZone.price) : 0;
  const grandTotal  = total + deliveryFee;

  const onSubmit = async (data: CheckoutFormValues) => {
    createOrder.mutate({
      data: {
        customerName:    data.customerName,
        customerPhone:   data.customerPhone,
        customerAddress: data.customerAddress,
        paymentMethod:   data.paymentMethod,
        items: items.map(item => ({
          productId:       item.productId,
          productName:     item.productName,
          productImageUrl: item.productImageUrl,
          quantity:        item.quantity,
          unitPrice:       item.unitPrice,
        })),
        deliveryZoneId:   selectedZone?.id   ?? null,
        deliveryZoneName: selectedZone?.name ?? null,
        deliveryFee:      deliveryFee,
      }
    }, {
      onSuccess: async (order) => {
        clearCart();

        if (data.paymentMethod === "cash" as string) {
          setLocation(`/order-confirmation/${order.id}`);
          return;
        }

        setRedirecting(true);
        try {
          const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
          const res = await fetch(`${apiBase}/api/payment/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
          const result = await res.json();

          if (res.ok && result.paymentUrl) {
            window.location.href = result.paymentUrl;
          } else {
            toast({
              title: "Paiement impossible",
              description: result?.error ?? "Échec du paiement en ligne.",
              variant: "destructive",
            });
            setRedirecting(false);
          }
        } catch {
          toast({
            title: "Erreur réseau",
            description: "Impossible de joindre le service de paiement. Veuillez réessayer.",
            variant: "destructive",
          });
          setRedirecting(false);
        }
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de créer la commande. Veuillez réessayer.",
          variant: "destructive",
        });
      }
    });
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
                  <h2 className="text-lg font-bold mb-5 border-b pb-3">Vos informations</h2>
                  <div className="space-y-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" className="h-12 bg-muted/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Numéro de téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+225 XX XX XX XX" className="h-12 bg-muted/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="customerAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Adresse de livraison</FormLabel>
                        <FormControl>
                          <Input placeholder="Quartier, Rue, Repère..." className="h-12 bg-muted/50" {...field} />
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
                      {/* "No zone" option */}
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
                            {zone.description && (
                              <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
                            )}
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
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          {/* Wave */}
                          <label className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === 'wave' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <RadioGroupItem value="wave" className="shrink-0" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                <Wifi className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">Wave</p>
                                <p className="text-xs text-muted-foreground">Paiement mobile Wave</p>
                              </div>
                            </div>
                            {field.value === 'wave' && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />}
                          </label>

                          {/* Orange Money */}
                          <label className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === 'orange_money' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <RadioGroupItem value="orange_money" className="shrink-0" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                                <Smartphone className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">Orange Money</p>
                                <p className="text-xs text-muted-foreground">Paiement mobile Orange</p>
                              </div>
                            </div>
                            {field.value === 'orange_money' && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />}
                          </label>

                          {/* Free Money */}
                          <label className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === 'free_money' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <RadioGroupItem value="free_money" className="shrink-0" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                                <Zap className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">Free Money</p>
                                <p className="text-xs text-muted-foreground">Paiement mobile Free</p>
                              </div>
                            </div>
                            {field.value === 'free_money' && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />}
                          </label>

                          {/* Expresso */}
                          <label className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${field.value === 'expresso' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <RadioGroupItem value="expresso" className="shrink-0" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                                <Smartphone className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">Expresso Money</p>
                                <p className="text-xs text-muted-foreground">Paiement mobile Expresso</p>
                              </div>
                            </div>
                            {field.value === 'expresso' && <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />}
                          </label>

                          {/* Cash */}
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

                  {/* Diamanopay badge */}
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
                    {isPending ? (redirecting ? "Redirection en cours..." : "Traitement...") : (
                      paymentMethod === 'cash' ? "Confirmer la commande" : "Payer avec Diamonopay"
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
                      <p className="text-white/60 text-xs">Qté: {item.quantity}</p>
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
          {isPending ? (redirecting ? "Redirection..." : "Traitement...") : (
            paymentMethod === 'cash' ? "Confirmer la commande" : "Payer avec Diamonopay"
          )}
        </Button>
      </div>
    </Layout>
  );
}
