"use client";
import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  Menu,
  User,
  Home,
  FileText,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Eye,
  X,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  CardContent,
  CardTitle,
  CardHeader,
} from "@/components/ui/global";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  prayerService,
  PrayerRequestStatus,
  PrayerRequest,
  PrayerStatistics,
} from "../services/prayer";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  zodResolver,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "../components/ui/ceckbox";


import { useForm } from "react-hook-form";
import * as z from "zod";
import { 

  CreatePrayerRequestDto 
} from "../services/prayer";

interface ViewModalProps {
  request: PrayerRequest | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: PrayerRequestStatus) => Promise<void>;
}

const createPrayerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phoneNumber: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
  canContact: z.boolean().default(false),
});

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateModal: React.FC<CreateModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createPrayerSchema>>({
    resolver: zodResolver(createPrayerSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      subject: "",
      description: "",
      canContact: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof createPrayerSchema>) => {
    try {
      setIsSubmitting(true);
      await prayerService.createPrayerRequest(values);
      toast({
        title: "Sucesso",
        description: "Pedido de oração criado com sucesso!",
      });
      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o pedido de oração.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Oração</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo pedido de oração
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o telefone"
                      type="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o assunto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a descrição do pedido"
                      className="h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="canContact"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Permite contato</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const ViewModal: React.FC<ViewModalProps> = ({
  request,
  open,
  onClose,
  onStatusUpdate,
}) => {
  const [status, setStatus] = useState<PrayerRequestStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (request) {
      setStatus(request.status);
    }
  }, [request]);

  const handleStatusUpdate = async () => {
    if (!request || !status) return;

    try {
      setUpdating(true);
      await onStatusUpdate(request.id, status);
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!request) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido de Oração</DialogTitle>
          <DialogDescription>
            Visualize os detalhes e atualize o status do pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Nome</h4>
            <p className="text-sm">{request.name}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Telefone</h4>
            <p className="text-sm">{request.phoneNumber}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Assunto</h4>
            <p className="text-sm">{request.subject}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Descrição
            </h4>
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Pode Contatar
            </h4>
            <p className="text-sm">{request.canContact ? "Sim" : "Não"}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Data de Criação
            </h4>
            <p className="text-sm">{formatDate(request.createdAt)}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Última Atualização
            </h4>
            <p className="text-sm">{formatDate(request.updatedAt)}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500">Status</h4>
            <Select
              value={status as any}
              onValueChange={(value: PrayerRequestStatus) => setStatus(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PrayerRequestStatus.PENDING}>
                  Pendente
                </SelectItem>
                <SelectItem value={PrayerRequestStatus.IN_PRAYER}>
                  Em Oração
                </SelectItem>
                <SelectItem value={PrayerRequestStatus.COMPLETED}>
                  Completado
                </SelectItem>
                <SelectItem value={PrayerRequestStatus.ARCHIVED}>
                  Arquivado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={status === request.status || updating}
          >
            {updating ? "Atualizando..." : "Atualizar Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<PrayerStatistics | null>(null);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(
    null
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const openCreateModal = () => {
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, requestsData] = await Promise.all([
        prayerService.getStatistics(),
        prayerService.getPrayerRequests({ take: 10 }),
      ]);

      setStatistics(statsData);
      setPrayerRequests(requestsData.items);
      setTotalRequests(requestsData.total);
      // Limpar seleção quando os dados são recarregados
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (
    id: string,
    status: PrayerRequestStatus
  ) => {
    try {
      await prayerService.updateStatus(id, status);
      fetchData();
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pedido de oração?"))
      return;

    try {
      await prayerService.deletePrayerRequest(id);
      toast({
        title: "Sucesso",
        description: "Pedido de oração excluído com sucesso!",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedIds(new Set(prayerRequests.map((req) => req.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean | "indeterminate") => {
    const newSelectedIds = new Set(selectedIds);
    if (checked === true) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleDeleteAll = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsDeletingAll(true);
      const deletePromises = Array.from(selectedIds).map((id) =>
        prayerService.deletePrayerRequest(id)
      );
      await Promise.all(deletePromises);
      
      toast({
        title: "Sucesso",
        description: `${selectedIds.size} pedido(s) de oração excluído(s) com sucesso!`,
      });
      
      setSelectedIds(new Set());
      setDeleteAllModalOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir alguns pedidos.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const isAllSelected = prayerRequests.length > 0 && selectedIds.size === prayerRequests.length;

  const openViewModal = (request: PrayerRequest) => {
    setSelectedRequest(request);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setSelectedRequest(null);
    setViewModalOpen(false);
  };

  const getStatusColor = (status: PrayerRequestStatus): string => {
    const colors: Record<PrayerRequestStatus, string> = {
      [PrayerRequestStatus.PENDING]: "bg-yellow-100 text-yellow-800",
      [PrayerRequestStatus.IN_PRAYER]: "bg-blue-100 text-blue-800",
      [PrayerRequestStatus.COMPLETED]: "bg-green-100 text-green-800",
      [PrayerRequestStatus.ARCHIVED]: "bg-gray-100 text-gray-800",
    };

    return colors[status];
  };

  const getTranslation = (status: PrayerRequestStatus) => {
    switch (status) {
      case PrayerRequestStatus.PENDING:
        return "Pendente";
      case PrayerRequestStatus.IN_PRAYER:
        return "Em oração";
      case PrayerRequestStatus.COMPLETED:
        return "Completado";
      case PrayerRequestStatus.ARCHIVED:
        return "Arquivado";
    }
  };

  const renderPrayerStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold text-yellow-600">
            {statistics?.byStatus.pending ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Em Oração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold text-blue-600">
            {statistics?.byStatus.inPrayer ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Completados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold text-green-600">
            {statistics?.byStatus.completed ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Arquivados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold text-gray-600">
            {statistics?.byStatus.archived ?? 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPrayerRequests = () => (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <CardTitle>Pedidos de Oração</CardTitle>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteAllModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Selecionados ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            onClick={()=> setCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assunto
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prayerRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(request.id, checked)
                        }
                      />
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {request.name}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {request.subject}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getTranslation(request.status)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 lg:px-6 py-4 whitespace-nowrap">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(request)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(request.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      {renderPrayerStats()}
      {renderPrayerRequests()}
      <ViewModal
        request={selectedRequest}
        open={viewModalOpen}
        onClose={closeViewModal}
        onStatusUpdate={handleStatusUpdate}
      />
      <CreateModal
        open={createModalOpen}
        onClose={closeCreateModal}
        onSuccess={fetchData}
      />
      <Dialog open={deleteAllModalOpen} onOpenChange={setDeleteAllModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} pedido(s) de oração selecionado(s)? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setDeleteAllModalOpen(false)}
              disabled={isDeletingAll}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? "Excluindo..." : "Excluir Todos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboard;
