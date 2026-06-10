import { useState } from "react";
import { AdminLayout } from "./dashboard";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  useAdminListCategories,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, Upload, X, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const productSchema = z.object({
  name: z.string().min(2, "Minimum 2 caractères"),
  description: z.string().min(5, "Minimum 5 caractères"),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().optional().nullable(),
  imageUrl: z.string().min(1, "Veuillez ajouter une image"),
  categorySlug: z.string().min(2),
  stock: z.coerce.number().min(0),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  onSale: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Échec de l'upload");
      const data = await res.json();
      onChange(data.url);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'uploader l'image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value ? (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border bg-muted">
          <img src={value} alt="Aperçu" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors bg-muted/30">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <>
                <Image className="h-10 w-10 opacity-40" />
                <span className="text-sm font-medium">Cliquer pour choisir une photo</span>
                <span className="text-xs opacity-60">JPG, PNG, WEBP — max 5 Mo</span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}

      {/* Also allow URL paste */}
      {!value && (
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-muted-foreground/20" />
          <span className="text-xs text-muted-foreground">ou coller une URL</span>
          <div className="h-px flex-1 bg-muted-foreground/20" />
        </div>
      )}
      {!value && (
        <Input
          placeholder="https://..."
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )}
    </div>
  );
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useListProducts({ search });
  const { data: categories = [] } = useAdminListCategories();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", description: "", price: 0, imageUrl: "", categorySlug: "parfums", stock: 10,
      isFeatured: false, isNew: true, onSale: false, originalPrice: null
    }
  });

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.imageUrl,
      categorySlug: product.categorySlug,
      stock: product.stock,
      isFeatured: product.isFeatured,
      isNew: product.isNew,
      onSale: product.onSale,
    });
    setIsOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    form.reset({
      name: "", description: "", price: 0, imageUrl: "", categorySlug: "parfums", stock: 10,
      isFeatured: false, isNew: true, onSale: false, originalPrice: null
    });
    setIsOpen(true);
  };

  const onSubmit = (data: ProductFormValues) => {
    if (editingId) {
      updateProduct.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: "Succès", description: "Produit mis à jour." });
            setIsOpen(false);
          },
          onError: (err: unknown) => {
            const msg = (err as { message?: string })?.message ?? "Mise à jour échouée.";
            toast({ title: "Erreur mise à jour", description: msg, variant: "destructive" });
          },
        }
      );
    } else {
      createProduct.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: "Succès", description: "Produit créé." });
            setIsOpen(false);
          },
          onError: (err: unknown) => {
            const msg = (err as { message?: string })?.message ?? "Création échouée.";
            toast({ title: "Erreur création", description: msg, variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Supprimer ce produit ?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Succès", description: "Produit supprimé." });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-secondary">Gestion des Produits</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew} className="font-bold w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nouveau Produit
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Photo upload */}
                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Photo du produit</FormLabel>
                    <FormControl>
                      <ImageUploader value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Nom du produit</FormLabel>
                      <FormControl><Input placeholder="Ex: Parfum Oud Gold" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="categorySlug" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.slug} value={c.slug}>
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                          {categories.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              Aucune catégorie — créez-en d'abord dans "Catégories"
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Description</FormLabel>
                    <FormControl><Input placeholder="Courte description du produit..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm">Prix (FCFA)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="originalPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm">Ancien prix</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stock" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-sm">Stock</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex flex-wrap gap-6 p-4 bg-muted/50 rounded-xl">
                  <FormField control={form.control} name="isFeatured" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="m-0 font-medium cursor-pointer">Populaire</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isNew" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="m-0 font-medium cursor-pointer">Nouveau</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="onSale" render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="m-0 font-medium cursor-pointer">En Promo</FormLabel>
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 font-bold text-base text-white"
                  disabled={createProduct.isPending || updateProduct.isPending}
                >
                  {editingId ? "Mettre à jour" : "Créer le produit"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
          ) : products?.map((product) => (
            <div key={product.id} className="flex items-center gap-3 p-4">
              <img src={product.imageUrl} alt={product.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{product.name}</p>
                <p className="text-primary font-bold text-sm">{product.price.toLocaleString()} F</p>
                <div className="flex gap-1 mt-1">
                  {product.isFeatured && <Badge variant="default" className="text-[9px] px-1 py-0">Pop</Badge>}
                  {product.isNew && <Badge variant="secondary" className="text-[9px] px-1 py-0">New</Badge>}
                  {product.onSale && <Badge variant="destructive" className="text-[9px] px-1 py-0">Promo</Badge>}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(product)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-16">Photo</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-center">Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img src={product.imageUrl} alt={product.name} className="w-11 h-11 rounded-lg object-cover" />
                  </TableCell>
                  <TableCell className="font-bold">{product.name}</TableCell>
                  <TableCell className="capitalize text-xs font-semibold text-muted-foreground">{product.categorySlug}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{product.price.toLocaleString()} F</TableCell>
                  <TableCell className="text-right">
                    <span className={product.stock < 5 ? "text-destructive font-bold" : "text-green-600 font-medium"}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    {product.isFeatured && <Badge variant="default" className="text-[10px] px-1">Pop</Badge>}
                    {product.isNew && <Badge variant="secondary" className="text-[10px] px-1">New</Badge>}
                    {product.onSale && <Badge variant="destructive" className="text-[10px] px-1">Promo</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
