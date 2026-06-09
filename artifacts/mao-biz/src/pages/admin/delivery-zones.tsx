import { useState } from "react";
import { AdminLayout } from "./dashboard";
import {
  useAdminListDeliveryZones,
  useCreateDeliveryZone,
  useUpdateDeliveryZone,
  useDeleteDeliveryZone,
  getAdminListDeliveryZonesQueryKey,
} from "@workspace/api-client-react";
import type { DeliveryZone } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const zoneSchema = z.object({
  name:        z.string().min(1, "Nom requis"),
  description: z.string().nullable().optional(),
  price:       z.coerce.number().min(0, "Prix minimum 0"),
  isActive:    z.boolean().default(true),
});

type ZoneFormValues = z.infer<typeof zoneSchema>;

function ZoneFormDialog({
  zone,
  trigger,
  onSaved,
}: {
  zone?: DeliveryZone;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name:        zone?.name ?? "",
      description: zone?.description ?? "",
      price:       zone?.price ?? 0,
      isActive:    zone?.isActive ?? true,
    },
  });

  const onSubmit = (data: ZoneFormValues) => {
    const payload = {
      name:        data.name,
      description: data.description ?? null,
      price:       data.price,
      isActive:    data.isActive,
    };

    if (zone) {
      updateZone.mutate(
        { id: zone.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Zone mise à jour" });
            setOpen(false);
            onSaved();
          },
          onError: () => toast({ title: "Erreur", variant: "destructive" }),
        }
      );
    } else {
      createZone.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Zone créée" });
            form.reset();
            setOpen(false);
            onSaved();
          },
          onError: () => toast({ title: "Erreur", variant: "destructive" }),
        }
      );
    }
  };

  const isPending = createZone.isPending || updateZone.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{zone ? "Modifier la zone" : "Nouvelle zone de livraison"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la zone <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Dakar Plateau, Banlieue, Thiès..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Livraison en 2h dans le centre-ville" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Frais de livraison (FCFA) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="100" placeholder="2000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel>Zone active</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Les clients voient uniquement les zones actives</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1 text-white" disabled={isPending}>
                {isPending ? "Enregistrement..." : (zone ? "Mettre à jour" : "Créer")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDeliveryZones() {
  const { data: zones = [], isLoading } = useAdminListDeliveryZones();
  const deleteZone = useDeleteDeliveryZone();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getAdminListDeliveryZonesQueryKey() });
  };

  const handleDelete = (id: number) => {
    deleteZone.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Zone supprimée" });
          refresh();
        },
        onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-secondary">Zones de livraison</h2>
          <p className="text-muted-foreground mt-1 text-sm">Gérez les zones et les frais de livraison proposés au checkout.</p>
        </div>
        <ZoneFormDialog
          trigger={
            <Button className="text-white gap-2">
              <Plus className="h-4 w-4" /> Ajouter une zone
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {zones.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-white rounded-xl border">
          <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Aucune zone de livraison</p>
          <p className="text-sm text-muted-foreground mt-1">Créez une première zone pour qu'elle apparaisse au checkout.</p>
        </div>
      )}

      {(zones.length > 0 || isLoading) && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Frais (FCFA)</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-semibold">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {zone.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {zone.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-black text-primary">
                    {zone.price === 0 ? (
                      <span className="text-green-600 font-bold">Gratuit</span>
                    ) : (
                      Number(zone.price).toLocaleString()
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {zone.isActive ? (
                      <Badge className="bg-green-100 text-green-800 border-none hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ZoneFormDialog
                        zone={zone}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        }
                        onSaved={refresh}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer « {zone.name} » ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La zone sera définitivement supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(zone.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
}
