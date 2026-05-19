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
    PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    COMPLETED: "bg-green-100 text-green-800 hover:bg-green-200",
    FAILED: "bg-red-100 text-red-800 hover:bg-red-200",
    PROCESSING: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    APPROVED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800 hover:bg-gray-200";
};

const getStatusText = (status: string) => {
  const statusTexts: any = {
    PENDING: "Pendente",
    COMPLETED: "Concluído",
    FAILED: "Recusado",
    PROCESSING: "Processando",
    APPROVED: "Pendente",
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
      setTransactions(data.transactions);
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
      setWithdrawals(data.withdrawals);
      setWithdrawalsPaginationMeta(data.meta);
    } catch (error) {
      toast.error("Não foi possível carregar os saques.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Saldo disponível
              </p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(financialSummary.availableBalance)}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Saque em processo
              </p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(Number(financialSummary.netLockedBalance ?? financialSummary.pendingWithdraws))}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Saldo em processamento
              </p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(financialSummary.lockedBalance)}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowDownLeft className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFeeInfo = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-600 space-y-1">
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
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
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
          <p className="text-sm text-gray-700">
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
                        className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm">Não disponível</span>
                    </div>
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
        <div className="w-full bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Atenção: As solicitações de saque são processadas em até 48 horas apenas em dias úteis.
              </p>
            </div>
          </div>
        </div>

        {hasPendingWithdraw && (
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

        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Histórico de saques</TabsTrigger>
          </TabsList>

          <div className="flex gap-4">
            {activeTab === "withdrawals" && (
              <Button
                onClick={handleSyncWithdrawals}
                disabled={isSyncing}
                variant="outline"
              >
                {isSyncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    Sincronizando...
                  </>
                ) : (
                  "Sincronizar Histórico"
                )}
              </Button>
            )}
            <Button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Solicitar Saque
            </Button>
          </div>
        </div>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="startDate">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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

                <div>
                  <Label htmlFor="status">Tipo</Label>
                  <Select value={description} onValueChange={setDescription}>
                    <SelectTrigger>
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
                <div className="flex items-end">
                  <Button
                    onClick={() => fetchTransactions(1)}
                    variant="outline"
                    className="w-full"
                  >
                    Filtrar
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Excel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {renderSummaryCards()}
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            renderTransactionTable(transactions)
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          {renderSummaryCards()}
          {renderFeeInfo()}

          {withdrawals.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Status do Saque Atual</h3>
                {withdrawals.slice(0, 1).map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`h-3 w-3 rounded-full ${withdrawal.status === 'PENDING' || withdrawal.status === 'APPROVED' ? 'bg-yellow-500' :
                          withdrawal.status === 'COMPLETED' ? 'bg-green-500' :
                            withdrawal.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></div>
                      <div>
                        <p className="font-medium">
                          Saque de {formatCurrency(withdrawal.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Solicitado em {new Date(withdrawal.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {getStatusText(withdrawal.status)}
                      </Badge>
                      {withdrawal.status === "FAILED" && withdrawal.rejectionReason && (
                        <div className="relative group">
                          <Info className="h-4 w-4 text-red-500 cursor-help" />
                          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="absolute bottom-full right-4 mb-0">
                              <div className="border-4 border-transparent border-b-gray-900"></div>
                            </div>
                            <div className="font-semibold mb-1">Razão da Rejeição:</div>
                            <div>{withdrawal.rejectionReason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            renderWithdrawalsTable()
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Saque */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {hasPendingWithdraw && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <p className="text-yellow-700 text-sm text-center font-medium">
                  Já existe um saque pendente. Aguarde a aprovação antes de solicitar novo.
                </p>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wd-amount" className="text-right">Valor</Label>
              <div className="col-span-3 relative">
                <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                <Input
                  id="wd-amount"
                  type="text"
                  value={withdrawalAmount}
                  onChange={handleAmountChange}
                  disabled={hasPendingWithdraw}
                  className="pl-8"
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Disponível: {formatCurrency(financialSummary?.availableBalance ?? 0)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="wd-pix" className="text-right">PIX</Label>
              <Input
                id="wd-pix"
                type="text"
                value={pixKey}
                onChange={handlePixKeyChange}
                disabled={hasPendingWithdraw}
                className="col-span-3"
                placeholder="CPF ou CNPJ"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Valor mínimo: {formatCurrency(platformFees.saqueMin)} · Taxa: {formatCurrency(platformFees.taxaFixa)}
            </p>
            {parseFloat(withdrawalAmount) > 0 && (
              <p className="text-xs text-center font-medium text-green-700">
                Estimativa de recebimento:{" "}
                {formatCurrency(Math.max(0, parseFloat(withdrawalAmount) - platformFees.taxaFixa))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsWithdrawModalOpen(false); setWithdrawalAmount(""); setPixKey(""); }} disabled={isWithdrawing}>
              Cancelar
            </Button>
            <Button
              onClick={handleWithdrawalRequest}
              disabled={hasPendingWithdraw || isWithdrawing || !withdrawalAmount || !pixKey}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isWithdrawing ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para visualizar nota fiscal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReceiptModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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
