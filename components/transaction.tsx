import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/global";
import { Button } from "@/components/ui/global";
import { Label } from "@/components/ui/global";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/global";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/global";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import { jsonToExcel } from "@/services/excel";

import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

const getDocumentType = (document?: string | null) => {
  const digits = (document ?? "").replace(/\D/g, "");
  if (digits.length === 11) return "CPF";
  if (digits.length === 14) return "CNPJ";
  return "";
};

function adaptTransaction(item: any): Transaction {
  if (![item.amountCents, item.netAmountCents, item.platformFeeCents, item.acquirerFeeCents].every(Number.isSafeInteger)) throw new Error('Contrato financeiro inválido');
  return { ...item, userId: '', walletId: '', name: item.customerName ?? '', email: item.customerEmail ?? '', customer_phone: item.customerPhone ?? '', customer_document: item.customerDocument ?? '', customer_document_type: getDocumentType(item.customerDocument), updatedAt: item.createdAt, amount: item.amountCents / 100, amountWithoutAllFee: item.netAmountCents / 100, fee: item.platformFeeCents / 100, dom_fee: item.acquirerFeeCents / 100, payment_method: item.paymentMethod, appliedGlobalFee: false };
}
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  name?: string;
  email?: string;
  status: string;
  description?: string;
  appliedGlobalFee: boolean;
  fee: number;
  dom_fee: number;
  payment_method: string;
  amountWithoutAllFee: number;
  walletId: string;
  createdAt: string;
  paymentId?: string;
  updatedAt: string;
}

interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface TransactionResponse {
  transactions: Transaction[];
  meta: PaginationMeta;
}

// ─── Status badge (glass translucent, rounded-md) ──────────────────────────
const statusBadge: Record<string, string> = {
  PENDING:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 backdrop-blur-sm",
  COMPLETED:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 backdrop-blur-sm",
  APPROVED:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 backdrop-blur-sm",
  PROCESSING:
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25 backdrop-blur-sm",
  FAILED:
    "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25 backdrop-blur-sm",
  REJECTED:
    "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25 backdrop-blur-sm",
  EXPIRED:
    "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/25 backdrop-blur-sm",
  REFUNDED:
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25 backdrop-blur-sm",
  DRAFT:
    "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/25 backdrop-blur-sm",
};

const getStatusBadge = (status: string) =>
  statusBadge[String(status || "").toUpperCase()] ||
  "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border border-zinc-500/25 backdrop-blur-sm";

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  COMPLETED: "Completado",
  APPROVED: "Aprovado",
  PROCESSING: "Processando",
  FAILED: "Falhou",
  REJECTED: "Recusado",
  EXPIRED: "Expirado",
  REFUNDED: "Estornado",
  DRAFT: "Rascunho",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const stripInternalTags = (description?: string | null) => {
  if (!description) return "";
  return description
    .replace(/\[TENANT:[^\]]+\]/gi, "")
    .replace(/\[CPF_DONO:[^\]]+\]/gi, "")
    .trim();
};

const getLocalDateString = (dateInput: string | Date) => {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getTranslatedPaymentMethod = (paymentMethod: string) => {
  switch (paymentMethod) {
    case "PIX":
      return "PIX";
    case "CREDIT_CARD":
      return "Cartão de Crédito/Débito";
    default:
      return paymentMethod;
  }
};

// ─── Main Component ────────────────────────────────────────────────────────
const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [description, setDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let url = `/api/finance/transactions?limit=100`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (statusFilter && statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (description && description !== "ALL") url += `&search=${encodeURIComponent(description)}`;

      const response = await fetch(url, { headers: { accept: "*/*" } });
      if (!response.ok) throw new Error("Falha ao exportar dados");
      const exportData = await response.json();

      const columns = [
        { header: "Nome", key: "nome", width: 35 },
        { header: "Data", key: "data", width: 15 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Email", key: "email", width: 35 },
        { header: "Número de telefone", key: "número de telefone", width: 35 },
        { header: "Documento", key: "documento", width: 25 },
        { header: "Tipo do documento", key: "tipo do documento", width: 15 },
        { header: "Método de Pagamento", key: "método de pagamento", width: 15 },
        { header: "Valor Recebido", key: "valor", width: 15 },
      ];

      const records = [...exportData.data];
      for (let page = 2; page <= exportData.meta.totalPages; page++) {
        const next = await fetch(url + `&page=${page}`);
        if (!next.ok) throw new Error('Falha na exportação');
        records.push(...(await next.json()).data);
      }
      const transactions0 = records.map(adaptTransaction);
      const filtered = transactions0;

      const formatted = filtered.map((t: any) => ({
        nome: t.name || "",
        data: new Date(t.createdAt).toLocaleDateString("pt-BR"),
        tipo: stripInternalTags(t.description),
        email: t.email || "",
        "número de telefone": t.customer_phone || "",
        documento: t.customer_document || "",
        "tipo do documento": t.customer_document_type || "",
        "método de pagamento": getTranslatedPaymentMethod(t.payment_method),
        valor: formatCurrency(t.amountWithoutAllFee),
      }));

      jsonToExcel(formatted, columns, `transacoes-${new Date().toISOString().split("T")[0]}`);
      toast.success("Arquivo Excel exportado com sucesso!");
    } catch {
      toast.error("Não foi possível exportar o arquivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
    setIsLoadingBalances(true);
    setIsLoadingBalances(false);
  }, [activeTab]);

  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    try {
      let url = `/api/finance/transactions?page=${page}&limit=${paginationMeta.itemsPerPage}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (statusFilter && statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (description && description !== "ALL") url += `&search=${encodeURIComponent(description)}`;

      const response = await fetch(url, {
        headers: { accept: "*/*", "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error('Falha na consulta financeira');
      const data = await response.json();
      setTransactions(data.data.map(adaptTransaction));
      setPaginationMeta({ currentPage: data.meta.page, itemsPerPage: data.meta.limit, totalItems: data.meta.total, totalPages: data.meta.totalPages });
    } catch {
      setTransactions([]);
      toast.error("Não foi possível carregar as transações. A validação segura da identidade pode estar indisponível.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (page: number) => void
  ) => (
    <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} variant="outline" size="sm">
          Anterior
        </Button>
        <Button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="outline" size="sm">
          Próxima
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-black/50 dark:text-white/50">
          Mostrando{" "}
          <span className="font-medium text-black dark:text-white">
            {(currentPage - 1) * itemsPerPage + 1}
          </span>{" "}
          até{" "}
          <span className="font-medium text-black dark:text-white">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{" "}
          de <span className="font-medium text-black dark:text-white">{totalItems}</span> resultados
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber = i + 1;
            if (currentPage > 3 && totalPages > 5) {
              pageNumber = Math.max(Math.min(currentPage - 2 + i, totalPages - 4 + i), i + 1);
            }
            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
          <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // The server applies the same inclusive UTC filters to listing and export.
  const displayedTransactions = transactions;

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] p-4 mb-4">
          <Info className="h-4 w-4 text-black/40 dark:text-white/40 shrink-0 mt-0.5" />
          <p className="text-sm text-black/60 dark:text-white/60">
            Atenção: As solicitações de saque são processadas em até 48 horas apenas em dias úteis.
          </p>
        </div>

        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <Label>Data Inicial</Label>
                  <DatePicker
                    value={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
                    onChange={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data Final</Label>
                  <DatePicker
                    value={endDate ? new Date(`${endDate}T12:00:00`) : undefined}
                    onChange={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                    placeholder="dd/mm/aaaa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="COMPLETED">Completado</SelectItem>
                      <SelectItem value="FAILED">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={description} onValueChange={setDescription}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="ibb_social">IBB social</SelectItem>
                      <SelectItem value="dizimo">Dízimo</SelectItem>
                      <SelectItem value="oferta">Oferta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => fetchTransactions(1)} variant="outline" className="flex-1">
                    Filtrar
                  </Button>
                  <Button onClick={handleExportExcel} disabled={isExporting} className="flex-1">
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white" />
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Valor Recebido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-black/60 dark:text-white/60 text-xs">
                          {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {stripInternalTags(transaction?.description)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {transaction?.name}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-black/60 dark:text-white/60">
                          {transaction?.email}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {getTranslatedPaymentMethod(transaction?.payment_method)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatCurrency(transaction.amountWithoutAllFee)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusBadge(transaction.status)}`}
                          >
                            {statusLabel[String(transaction.status || "").toUpperCase()] ?? transaction.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {displayedTransactions.length > 0 &&
                renderPagination(
                  paginationMeta.currentPage,
                  paginationMeta.totalPages,
                  paginationMeta.totalItems,
                  paginationMeta.itemsPerPage,
                  (page) => fetchTransactions(page)
                )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionsPage;
