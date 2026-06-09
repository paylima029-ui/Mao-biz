import { AdminLayout } from "./dashboard";
import { 
  useListOrders, 
  useUpdateOrderStatus,
  getListOrdersQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Eye, Clock, CheckCircle, PackageCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-none"><Clock className="w-3 h-3 mr-1"/> En attente</Badge>;
    case 'confirmed':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none"><CheckCircle className="w-3 h-3 mr-1"/> Confirmée</Badge>;
    case 'delivered':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none"><PackageCheck className="w-3 h-3 mr-1"/> Livrée</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function AdminOrders() {
  const { data: orders, isLoading } = useListOrders();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          toast({ title: "Statut mis à jour", description: `La commande est maintenant ${newStatus}.` });
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-secondary">Gestion des Commandes</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-center">Paiement</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-bold text-primary">{order.orderNumber}</TableCell>
                <TableCell>
                  <div className="font-semibold">{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell className="text-right font-black">{order.total.toLocaleString()} F</TableCell>
                <TableCell className="text-center">
                  {order.paymentMethod === 'diamanopay' ? (
                    <Badge variant="outline" className="border-primary text-primary">Diamanopay</Badge>
                  ) : (
                    <Badge variant="outline">Cash</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DialogTrigger asChild>
                          <DropdownMenuItem className="font-medium cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" /> Voir détails
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'pending')}>
                          Passer En attente
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'confirmed')}>
                          Passer Confirmée
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'delivered')}>
                          Passer Livrée
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Détails de la commande {order.orderNumber}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="font-bold">{order.customerName}</p>
                          <p>{order.customerPhone}</p>
                          <p className="text-sm mt-2">{order.customerAddress}</p>
                        </div>
                        <h4 className="font-bold border-b pb-2">Articles</h4>
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 text-sm items-center">
                              <img src={item.productImageUrl} className="w-10 h-10 rounded object-cover" />
                              <div className="flex-1 font-semibold">{item.productName}</div>
                              <div>{item.quantity} × {item.unitPrice} F</div>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-4 text-right">
                          <p className="text-2xl font-black text-primary">Total: {order.total.toLocaleString()} F</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
