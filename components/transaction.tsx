import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/global";
import { Button } from "@/components/ui/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/global";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/global";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
} from "lucide-react";
import { toast } from 'react-toastify';
import { jsonToExcel } from "@/services/excel";
import { MACHINE_API_URL, INTERNAL_API_URL, BOSQUE_USER_ID } from "@/constants/api";

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

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "APPROVED";
  pixKey: string;
  receiptImage?: string;
  fee?: string;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface WithdrawalResponse {
  withdrawals: Withdrawal[];
  meta: PaginationMeta;
}

interface FinancialSummary {
  availableBalance: number;
  pendingWithdraws: number;
  lockedBalance: number;
  netLockedBalance?: string | number;
}

interface PlatformFees {
  taxaFixa: number;
  taxaPercent: number;
  saqueMin: number;
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

const formatCPFCNPJ = (value: string) => {
  const numbersOnly = value.replace(/\D/g, "");

  if (numbersOnly.length <= 11) {
    return numbersOnly
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    return numbersOnly
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
};

const getStatusColor = (status: string) => {
  const statusColors: any = {
    PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 backdrop-blur-sm",
    COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-sm",
    FAILED: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 backdrop-blur-sm",
    PROCESSING: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 backdrop-blur-sm",
    APPROVED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 backdrop-blur-sm",
  };
  return statusColors[status] || "bg-black/[0.06] dark:bg-white/[0.06] text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10 backdrop-blur-sm";
};

const getStatusText = (status: string) => {
  const statusTexts: any = {
    PENDING: "Pendente",
    COMPLETED: "Concluído",
    FAILED: "Recusado",
    PROCESSING: "Processando",
    APPROVED: "Aprovado",
  };
  return statusTexts[status] || status;
};

const stripInternalTags = (description?: string | null) => {
  if (!description) return "";
  return description.replace(/\[TENANT:[^\]]+\]/gi, "").replace(/\[CPF_DONO:[^\]]+\]/gi, "").trim();
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [description, setDescription] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    availableBalance: 0,
    pendingWithdraws: 0,
    lockedBalance: 0,
  });
  const [platformFees, setPlatformFees] = useState<PlatformFees>({
    taxaFixa: 2,
    taxaPercent: 0,
    saqueMin: 100,
  });
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [withdrawalsPaginationMeta, setWithdrawalsPaginationMeta] =
    useState<PaginationMeta>({
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0,
      totalPages: 1,
    });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const hasPendingWithdraw = withdrawals.some(w =>
    w.status === 'PENDING' || w.status === 'APPROVED'
  );

  useEffect(() => {
    if (activeTab === "withdrawals") {
      fetchWithdrawals(1);
    } else {
      fetchTransactions(1);
    }
    fetchFinancialSummary();
  }, [activeTab]);

  useEffect(() => {
    fetchPlatformFees();
  }, []);

  const handleSyncWithdrawals = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${MACHINE_API_URL}/admin/sync-withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: BOSQUE_USER_ID }),
      });
      if (!response.ok) throw new Error("Falha ao sincronizar");
      const data = await response.json();
      const { created, updated, total } = data?.data ?? {};
      toast.success(`Sincronização concluída: ${created} criados, ${updated} atualizados (${total} total)`);
      fetchWithdrawals(1);
    } catch {
      toast.error("Não foi possível sincronizar o histórico de saques.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) { toast.error("Insira um valor válido."); return; }
    if (!pixKey.trim()) { toast.error("Insira uma chave PIX válida."); return; }
    if (amount < platformFees.saqueMin) {
      toast.error(`Valor mínimo para saque: ${formatCurrency(platformFees.saqueMin)}`); return;
    }
    if (amount > (financialSummary?.availableBalance ?? 0)) {
      toast.error("Saldo insuficiente para realizar o saque."); return;
    }
    setIsWithdrawing(true);
    try {
      const response = await fetch(`${INTERNAL_API_URL}/bosque/finance/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: BOSQUE_USER_ID, amount, pixKey: pixKey.trim() }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Falha ao solicitar saque");
      }
      toast.success(`Saque de ${formatCurrency(amount)} solicitado com sucesso!`);
      setIsWithdrawModalOpen(false);
      setWithdrawalAmount("");
      setPixKey("");
      fetchFinancialSummary();
      fetchWithdrawals(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível solicitar o saque.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setWithdrawalAmount((parseInt(value || "0") / 100).toFixed(2));
  };

  const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.replace(/\D/g, "");
    if (n.length <= 11) {
      setPixKey(n.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"));
    } else {
      setPixKey(n.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2"));
    }
  };

  const fetchPlatformFees = async () => {
    try {
      const response = await fetch(`${MACHINE_API_URL}/admin/plataformas/taxas`);
      if (!response.ok) return;
      const data = await response.json();
      const bosque = data?.data?.BOSQUE;
      if (bosque) {
        setPlatformFees({
          taxaFixa: bosque.TAXA_SAQUE_FIXA ?? 2,
          taxaPercent: bosque.TAXA_SAQUE_PERCENT ?? 0,
          saqueMin: bosque.SAQUE_MIN ?? 100,
        });
      }
    } catch {}
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let url = `${INTERNAL_API_URL}/bosque/finance/transactions?userId=${BOSQUE_USER_ID}&limit=5000`;

      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (statusFilter && statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (description && description !== "ALL") url += `&description=${description}`;

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
        },
      });

      if (!response.ok) throw new Error("Falha ao exportar dados");

      const columns = [
        { header: "Nome", key: "name", width: 35 },
        { header: "Data", key: "createdAt", width: 15 },
        { header: "Tipo", key: "description", width: 30 },
        { header: "Email", key: "email", width: 35 },
        { header: "Valor Recebido", key: "amountWithoutAllFee", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ];

      const result = await response.json();
      const formattedTransactions = result.transactions.map((transaction: any) => ({
        ...transaction,
        description: stripInternalTags(transaction.description),
        createdAt: new Date(transaction.createdAt).toLocaleDateString("pt-BR"),
        amountWithoutAllFee: formatCurrency(transaction.amountWithoutAllFee),
      }));

      jsonToExcel(
        formattedTransactions,
        columns,
        `transacoes-${new Date().toISOString().split("T")[0]}`
      );

      toast.success("Arquivo Excel exportado com sucesso!");
    } catch (error) {
      toast.error("Não foi possível exportar o arquivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewReceipt = (imageUrl: string) => {
    setReceiptImageUrl(imageUrl);
    setReceiptModalOpen(true);
  };

  const handleDownloadReceipt = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nota-fiscal-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar a nota fiscal");
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const response = await fetch(`${INTERNAL_API_URL}/bosque/finance/summary?userId=${BOSQUE_USER_ID}`, {
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setFinancialSummary(data);
    } catch (error) {
      toast.error("Não foi possível carregar o resumo financeiro.");
    }
  };

  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    try {
      let url = `${INTERNAL_API_URL}/bosque/finance/transactions?userId=${BOSQUE_USER_ID}&page=${page}&limit=${paginationMeta.itemsPerPage}`;

      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (statusFilter && statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (description && description !== "ALL") url += `&description=${description}`;

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
      });
      const data: TransactionResponse = await response.json();
      setTransactions(data.transactions ?? []);
      setPaginationMeta(data.meta);
    } catch (error) {
      toast.error("Não foi possível carregar as transações.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWithdrawals = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${INTERNAL_API_URL}/bosque/finance/withdrawals?userId=${BOSQUE_USER_ID}&page=${page}&limit=${withdrawalsPaginationMeta.itemsPerPage}`,
        {
          headers: {
            accept: "*/*",
              "Content-Type": "application/json",
          },
        }
      );
      const data: WithdrawalResponse = await response.json();
      setWithdrawals(data.withdrawals ?? []);
      setWithdrawalsPaginationMeta(data.meta);
    } catch (error) {
      toast.error("Não foi possível carregar os saques.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Saldo disponível</p>
              <h3 className="text-xl font-bold">{formatCurrency(financialSummary.availableBalance)}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Saque em processo</p>
              <h3 className="text-xl font-bold">{formatCurrency(financialSummary.pendingWithdraws)}</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Saldo em processamento</p>
              <h3 className="text-xl font-bold">{formatCurrency(Number(financialSummary.netLockedBalance ?? financialSummary.lockedBalance))}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFeeInfo = () => (
    <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-black/40 dark:text-white/40 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-black/60 dark:text-white/60 space-y-1">
          <p>
            <span className="font-medium">Taxa de saque:</span>{" "}
            {formatCurrency(platformFees.taxaFixa)}
            {platformFees.taxaPercent > 0
              ? ` + ${(platformFees.taxaPercent * 100).toFixed(2)}% do valor`
              : ""}
          </p>
          <p>
            <span className="font-medium">Valor mínimo:</span>{" "}
            {formatCurrency(platformFees.saqueMin)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (page: number) => void
  ) => (
    <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] bg-transparent px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          Anterior
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          Próxima
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-black/70 dark:text-white/70">
            Mostrando{" "}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            até{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{" "}
            de <span className="font-medium">{totalItems}</span> resultados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber = i + 1;

            if (currentPage > 3 && totalPages > 5) {
              pageNumber = Math.max(
                Math.min(currentPage - 2 + i, totalPages - 4 + i),
                i + 1
              );
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const getTranslatedPaymentMethod = (paymentMethod: string) => {
    switch (paymentMethod) {
      case "PIX":
        return "pix";
      case "CREDIT_CARD":
        return "Cartão de Crédito/Débito";
      default:
        return paymentMethod;
    }
  };

  const renderTransactionTable = (data: Transaction[]) => (
    <div className="overflow-auto">
      <div className="rounded-md border min-w-[800px] lg:min-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] lg:w-auto">Data</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Tipo</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Nome</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Email</TableHead>
              <TableHead className="w-[120px] lg:w-auto">Metodo de Pagamento</TableHead>
              <TableHead className="w-[120px] lg:w-auto">
                Valor Recebido
              </TableHead>
              <TableHead className="w-[100px] lg:w-auto">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {stripInternalTags(transaction?.description)}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {transaction?.name}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {transaction?.email}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {getTranslatedPaymentMethod(transaction?.payment_method)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatCurrency(transaction.amountWithoutAllFee)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`whitespace-nowrap ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {getStatusText(transaction.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data.length > 0 &&
        renderPagination(
          paginationMeta.currentPage,
          paginationMeta.totalPages,
          paginationMeta.totalItems,
          paginationMeta.itemsPerPage,
          (page) => fetchTransactions(page)
        )}
    </div>
  );

  const renderWithdrawalsTable = () => (
    <div className="overflow-auto">
      <div className="rounded-md border min-w-[800px] lg:min-w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] lg:w-auto">Data</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Nome</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Email</TableHead>
              <TableHead className="w-[120px] lg:w-auto">Valor</TableHead>
              <TableHead className="w-[120px] lg:w-auto">Chave PIX</TableHead>
              <TableHead className="w-[100px] lg:w-auto">Status</TableHead>
              <TableHead className="w-[150px] lg:w-auto">Nota Fiscal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(withdrawal.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {withdrawal.user.name}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {withdrawal.user.email}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatCurrency(withdrawal.amount)}
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {withdrawal.pixKey}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`whitespace-nowrap ${getStatusColor(
                        withdrawal.status
                      )}`}
                    >
                      {getStatusText(withdrawal.status)}
                    </Badge>
                    {withdrawal.status === "FAILED" && withdrawal.rejectionReason && (
                      <div className="relative group">
                        <Info className="h-4 w-4 text-red-500 cursor-help" />
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-0">
                            <div className="border-4 border-transparent border-b-gray-900"></div>
                          </div>
                          <div className="font-semibold mb-1">Razão da Rejeição:</div>
                          <div>{withdrawal.rejectionReason}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {withdrawal.receiptImage ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewReceipt(withdrawal.receiptImage!)}
                        className="flex items-center gap-1 px-3 py-1 text-sm border border-black/20 dark:border-white/20 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(withdrawal.receiptImage!)}
                        className="flex items-center gap-1 px-3 py-1 text-sm border border-green-500 text-green-500 rounded-md hover:bg-green-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Baixar
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Não disponível</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {withdrawals.length > 0 &&
        renderPagination(
          withdrawalsPaginationMeta.currentPage,
          withdrawalsPaginationMeta.totalPages,
          withdrawalsPaginationMeta.totalItems,
          withdrawalsPaginationMeta.itemsPerPage,
          (page) => fetchWithdrawals(page)
        )}
    </div>
  );

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {activeTab === "withdrawals" && (
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Saque</h2>
                <p className="text-sm text-gray-500">Gerencie seus saques e visualize seu saldo</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { fetchFinancialSummary(); fetchWithdrawals(withdrawalsPaginationMeta.currentPage); }}
                className="flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Atualizar
              </Button>
              <Button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="bg-black hover:bg-gray-800 text-white flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Solicitar Saque
              </Button>
            </div>
          </div>
        )}

        <div className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] rounded-md p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-black/70 dark:text-white/70">
                Atenção: As solicitações de saque são processadas em até 48 horas apenas em dias úteis.
              </p>
            </div>
          </div>
        </div>

        {hasPendingWithdraw && activeTab === "withdrawals" && (
          <div className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Você possui um saque pendente. Aguarde a aprovação para solicitar um novo saque.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <TabsList>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Histórico de Saques</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="space-y-6">
          <div className="border border-black/[0.08] dark:border-white/[0.08] rounded-lg p-4 bg-transparent">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Data Inicial</Label>
                <DatePicker
                  value={startDate ? new Date(`${startDate}T12:00:00`) : undefined}
                  onChange={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Data Final</Label>
                <DatePicker
                  value={endDate ? new Date(`${endDate}T12:00:00`) : undefined}
                  onChange={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                    <SelectItem value="FAILED">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={description} onValueChange={setDescription}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="ibb_social">IBB social</SelectItem>
                    <SelectItem value="dizimo">Dizimo</SelectItem>
                    <SelectItem value="oferta">Oferta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-0">
                <Button
                  onClick={() => fetchTransactions(1)}
                  variant="outline"
                >
                  Filtrar
                </Button>
                <Button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            renderTransactionTable(transactions)
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {renderSummaryCards()}
          {renderFeeInfo()}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Histórico de Saques</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncWithdrawals}
                  disabled={isSyncing}
                  className="flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isSyncing ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600" />
                </div>
              ) : (
                renderWithdrawalsTable()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Saque */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Solicitar Saque</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {hasPendingWithdraw && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="text-yellow-700 text-sm text-center font-medium">
                  Já existe um saque pendente. Aguarde a aprovação antes de solicitar novo.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd-amount">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">R$</span>
                <Input
                  id="wd-amount"
                  type="text"
                  value={withdrawalAmount}
                  onChange={handleAmountChange}
                  disabled={hasPendingWithdraw}
                  className="pl-9"
                  placeholder="0,00"
                />
              </div>
              <p className="text-xs text-gray-500">
                Saldo disponível: <span className="font-medium">{formatCurrency(financialSummary?.availableBalance ?? 0)}</span>
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd-pix">Chave PIX (CPF/CNPJ)</Label>
              <Input
                id="wd-pix"
                type="text"
                value={pixKey}
                onChange={handlePixKeyChange}
                disabled={hasPendingWithdraw}
                placeholder="Digite seu CPF ou CNPJ"
              />
            </div>
            <div className="rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/50 dark:text-white/50">Taxa por saque</span>
                <span className="text-xs font-medium text-black dark:text-white">
                  {platformFees.taxaPercent > 0
                    ? `${formatCurrency(platformFees.taxaFixa)} + ${(platformFees.taxaPercent * 100).toFixed(2)}%`
                    : formatCurrency(platformFees.taxaFixa)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/50 dark:text-white/50">Valor mínimo</span>
                <span className="text-xs font-medium text-black dark:text-white">{formatCurrency(platformFees.saqueMin)}</span>
              </div>
              {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                <div className="flex items-center justify-between pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <span className="text-xs font-medium text-black/70 dark:text-white/70">Você receberá</span>
                  <span className="text-sm font-semibold text-black dark:text-white">{formatCurrency(Math.max(0, parseFloat(withdrawalAmount) - platformFees.taxaFixa))}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setIsWithdrawModalOpen(false); setWithdrawalAmount(""); setPixKey(""); }} disabled={isWithdrawing}>
              Cancelar
            </Button>
            <Button
              onClick={handleWithdrawalRequest}
              disabled={hasPendingWithdraw || isWithdrawing || !withdrawalAmount || !pixKey}
              className="bg-gray-700 hover:bg-gray-800 text-white"
            >
              {isWithdrawing ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para visualizar nota fiscal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReceiptModalOpen(false)}>
          <div className="bg-white dark:bg-black/90 rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Nota Fiscal</h2>
              <button onClick={() => setReceiptModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center items-center p-4">
              {receiptImageUrl && (
                <img
                  src={receiptImageUrl}
                  alt="Nota Fiscal"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2 border border-black/20 dark:border-white/20 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors text-black dark:text-white"
              >
                Fechar
              </button>
              <button
                onClick={() => receiptImageUrl && handleDownloadReceipt(receiptImageUrl)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;
