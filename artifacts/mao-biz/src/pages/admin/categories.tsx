import { useState } from "react";
import { AdminLayout } from "./dashboard";
import {
  useAdminListCategories,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
  getAdminListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { Category } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
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

const categorySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  slug: z.string().min(1, "Slug requis").regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  icon: z.string().min(1, "Emoji/icône requis"),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

function CategoryFormDialog({
  category,
  trigger,
  onSaved,
}: {
  category?: Category;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useAdminCreateCategory();
  const update = useAdminUpdateCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      icon: category?.icon ?? "",
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!category) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug, { shouldValidate: true });
    }
  };

  const onSubmit = (data: CategoryFormValues) => {
    if (category) {
      update.mutate(
        { id: category.id, data },
        {
          onSuccess: () => { toast({ title: "Catégorie mise à jour" }); setOpen(false); onSaved(); },
          onError: () => toast({ title: "Erreur", variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { data },
        {
          onSuccess: () => { toast({ title: "Catégorie créée" }); form.reset(); setOpen(false); onSaved(); },
          onError: (err: any) => toast({
            title: "Erreur",
            description: err?.response?.data?.error ?? "Création échouée",
            variant: "destructive",
          }),
        }
      );
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <FormField control={form.control} name="icon" render={({ field }) => (
              <FormItem>
                <FormLabel>Emoji / Icône <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 👗 💍 👟 🎒"
                    className="text-2xl h-14 text-center"
                    maxLength={4}
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Collez ou tapez un emoji (ex: 👗)</p>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la catégorie <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Robes, Chaussures, Bijoux…"
                    {...field}
                    onChange={e => handleNameChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="slug" render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (identifiant URL) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="ex: robes, chaussures…" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">Généré automatiquement. Uniquement minuscules, chiffres et tirets.</p>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1 text-white" disabled={isPending}>
                {isPending ? "Enregistrement…" : (category ? "Mettre à jour" : "Créer")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCategories() {
  const { data: categories = [], isLoading } = useAdminListCategories();
  const deleteCategory = useAdminDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });

  const handleDelete = (id: number) => {
    deleteCategory.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Catégorie supprimée" }); refresh(); },
        onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-secondary">Catégories</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gérez les catégories affichées sur la boutique et dans les filtres produits.
          </p>
        </div>
        <CategoryFormDialog
          trigger={
            <Button className="text-white gap-2">
              <Plus className="h-4 w-4" /> Ajouter une catégorie
            </Button>
          }
          onSaved={refresh}
        />
      </div>

      {categories.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-white rounded-xl border">
          <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Aucune catégorie</p>
          <p className="text-sm text-muted-foreground mt-1">Créez une première catégorie pour organiser vos produits.</p>
        </div>
      )}

      {(categories.length > 0 || isLoading) && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-16 text-center">Icône</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Slug (URL)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement…</TableCell>
                </TableRow>
              ) : categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-center text-2xl">{cat.icon}</TableCell>
                  <TableCell className="font-semibold">{cat.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{cat.slug}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <CategoryFormDialog
                        category={cat}
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
                            <AlertDialogTitle>Supprimer « {cat.name} » ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette catégorie sera supprimée. Les produits associés garderont leur slug mais n'apparaîtront plus dans ce filtre.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(cat.id)}
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
