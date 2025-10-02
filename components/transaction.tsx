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
} from "lucide-react";
import { toast } from 'react-toastify';
import { jsonToExcel } from "@/services/excel";

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
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    APPROVED: "bg-yellow-100 text-yellow-800", // Tratado como PENDING
  };
  return statusColors[status] || "bg-gray-100 text-gray-800";
};

// Função para obter texto traduzido do status
const getStatusText = (status: string) => {
  const statusTexts: any = {
    PENDING: "Pendente",
    COMPLETED: "Concluído",
    FAILED: "Falhou",
    PROCESSING: "Processando",
    APPROVED: "Pendente", // Ainda aguardando processamento final
  };
  return statusTexts[status] || status;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const getFeriados = async () => {
  const ano = new Date().getFullYear();
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    const data = await response.json();
    return data.map((feriado: any) => ({
      date: feriado.date,
      name: feriado.name
    }));
  } catch (error) {
    console.error('Erro ao buscar feriados:', error);
    return [];
  }
};

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
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
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [noDiaUtilModal, setNoDiaUtilModal] = useState(false);
  const [feriadoInfo, setFeriadoInfo] = useState<{ name: string } | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const API_URL = "https://api-dom.jbmidia.com";

  // Verificar se há saque pendente (PENDING ou APPROVED)
  const hasPendingWithdraw = withdrawals.some(w =>
    w.status === 'PENDING' || w.status === 'APPROVED'
  );

  const [walletPerDescription, setWalletPerDescription] = useState<{
    [key: string]: number;
  }>({
    oferta: 0,
    primícia: 0,
    dizimo: 0,
    fundação: 0,
  });

  useEffect(() => {
    const checkDiaUtil = async () => {
      const hoje = new Date();
      const dataHoje = hoje.toISOString().split('T')[0];

      if (isWeekend(hoje)) {
        setNoDiaUtilModal(true);
        return;
      }

      const feriados = await getFeriados();
      interface Feriado {
        date: string;
        name: string;
      }

      const feriado = feriados.find((f: Feriado) => f.date === dataHoje);

      if (feriado) {
        setFeriadoInfo(feriado);
        setNoDiaUtilModal(true);
      }
    };

    checkDiaUtil();
  }, []);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let url = `${API_URL}/payments/all-transactions-excel?`;

      if (startDate) {
        url += `&startDate=${startDate}`;
      }
      if (endDate) {
        url += `&endDate=${endDate}`;
      }
      if (statusFilter && statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (description && description !== "ALL") {
        url += `&description=${description}`;
      }

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "x-access-token": "0ba3f139-b1ff-4ded-a5ef-71ccb1c9482f",
        },
      });

      if (!response.ok) throw new Error("Falha ao exportar dados");
      // Define columns for Excel export
      const columns = [
        { header: "Nome", key: "nome", width: 35 },
        { header: "Data", key: "data", width: 15 },
        { header: "Tipo", key: "tipo", width: 15 },
        { header: "Email", key: "email", width: 35 },
        { header: "Número de telefone", key: "número de telefone", width: 35 },
        { header: "Documento", key: "documento", width: 25 },
        { header: "Tipo do documento", key: "tipo do documento", width: 15 },
        { header: "Valor Recebido", key: "valor", width: 15 },
      ];
      const transactions0 = await response.json();
      console.log(transactions0);
      // Format data before export
      const formattedTransactions = transactions0.map((transaction: any) => ({
        ...transaction,
        createdAt: new Date(transaction.createdAt).toLocaleDateString("pt-BR"),
        amountWithoutAllFee: formatCurrency(transaction.amountWithoutAllFee),
      }));

      // Generate and download Excel file
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

  useEffect(() => {
    if (activeTab === "withdrawals") {
      fetchWithdrawals(1);
    } else {
      fetchTransactions(1);
    }
    fetchFinancialSummary();
  }, [activeTab]);

  const fetchFinancialSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/summary`, {
        headers: {
          accept: "*/*",
          "x-access-token": "0ba3f139-b1ff-4ded-a5ef-71ccb1c9482f",
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
      let url = `${API_URL}/payments/history?page=${page}&limit=${paginationMeta.itemsPerPage}`;

      if (startDate) {
        url += `&startDate=${startDate}`;
      }
      if (endDate) {
        url += `&endDate=${endDate}`;
      }
      if (statusFilter && statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (description && description !== "ALL") {
        url += `&description=${description}`;
      }

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "x-access-token": "0ba3f139-b1ff-4ded-a5ef-71ccb1c9482f",
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
        `${API_URL}/payments/withdrawals?page=${page}&limit=${withdrawalsPaginationMeta.itemsPerPage}`,
        {
          headers: {
            accept: "*/*",
            "x-access-token": "0ba3f139-b1ff-4ded-a5ef-71ccb1c9482f",
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

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast.error("Por favor, insira um valor válido para o saque.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Por favor, insira uma chave PIX válida.");
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch(`${API_URL}/payments/withdraw`, {
        method: "POST",
        headers: {
          accept: "*/*",
          "x-access-token": "0ba3f139-b1ff-4ded-a5ef-71ccb1c9482f",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawalAmount),
          pixKey: pixKey.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao solicitar saque");
      }

      toast.success(`PIX enviado com sucesso! ✅ Seu saque de ${formatCurrency(parseFloat(withdrawalAmount))} foi processado e está sendo transferido para sua conta.`);

      setIsModalOpen(false);
      setWithdrawalAmount("");
      setPixKey("");
      fetchWithdrawals(withdrawalsPaginationMeta.currentPage);
      fetchFinancialSummary();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível solicitar o saque.";
      toast.error(errorMessage);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPFCNPJ(e.target.value);
    setPixKey(formattedValue);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    const formattedValue = (parseInt(value || "0") / 100).toFixed(2);
    setWithdrawalAmount(formattedValue);
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
                {formatCurrency(financialSummary.pendingWithdraws)}
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
                  {transaction?.description}
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
                  <Badge
                    className={`whitespace-nowrap ${getStatusColor(
                      withdrawal.status
                    )}`}
                  >
                    {getStatusText(withdrawal.status)}
                  </Badge>
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

        {/* Banner de aviso para saque pendente */}
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
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={hasPendingWithdraw}
              className={`${hasPendingWithdraw
                  ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
                } text-white`}
            >
              {hasPendingWithdraw ? 'Saque Pendente' : 'Solicitar Saque'}
            </Button>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
            </DialogHeader>

            {/* Aviso sobre saque pendente no modal */}
            {hasPendingWithdraw && (
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md mb-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-yellow-800 font-medium">
                    Você já possui um saque pendente. Aguarde a aprovação para solicitar um novo.
                  </p>
                </div>
              </div>
            )}
            <div className="grid gap-4 py-4">
              {(isWeekend(new Date()) || feriadoInfo) && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-md">
                  <p className="text-red-600 font-medium text-center">
                    {isWeekend(new Date())
                      ? "Atenção! Hoje é final de semana. O processamento do seu saque só iniciará no próximo dia útil."
                      : `Atenção! Hoje é ${feriadoInfo?.name || 'feriado'}. O processamento do seu saque só iniciará no próximo dia útil.`}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Valor
                </Label>
                <div className="col-span-3 relative">
                  <div className="flex items-center justify-center gap-2">
                    <span className="absolute left-3  ">R$</span>
                    <Input
                      id="amount"
                      type="text"
                      value={withdrawalAmount}
                      onChange={handleAmountChange}
                      className={`pl-8 ${parseFloat(withdrawalAmount.replace(",", ".")) >
                          financialSummary.availableBalance - 2
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                        }`}
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Saldo máximo para saque: R${" "}
                    {(financialSummary.availableBalance - 2)
                      .toFixed(2)
                      .replace(".", ",")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pixKey" className="text-right">
                  PIX (CPF/CNPJ)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="pixKey"
                    type="text"
                    value={pixKey}
                    onChange={handlePixKeyChange}
                    placeholder="Digite seu CPF ou CNPJ"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Será cobrada uma taxa de R$ 2,00 por saque
              </p>
              <p className="text-sm text-red-500 font-medium text-center mt-1">
                O valor mínimo para saque deve ser de R$ 100,00
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setPixKey("");
                  setWithdrawalAmount("");
                }}
                disabled={isWithdrawing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleWithdrawalRequest}
                disabled={
                  isWithdrawing ||
                  hasPendingWithdraw ||
                  !withdrawalAmount ||
                  !pixKey ||
                  parseFloat(withdrawalAmount.replace(",", ".")) >
                  financialSummary.availableBalance - 1 ||
                  parseFloat(withdrawalAmount.replace(",", ".")) < 100
                }
                className={`${hasPendingWithdraw
                    ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                  } text-white`}
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : hasPendingWithdraw ? (
                  "Saque Pendente"
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={noDiaUtilModal} onOpenChange={setNoDiaUtilModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aviso Importante</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-gray-700 text-center">
                {isWeekend(new Date())
                  ? "Hoje é final de semana. Saques só podem ser solicitados em dias úteis."
                  : `Hoje é ${feriadoInfo?.name || 'feriado'}. Saques só podem ser solicitados em dias úteis.`}
              </p>
              <p className="text-sm text-gray-500 text-center">
                Por favor, aguarde o próximo dia útil para solicitar seu saque.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setNoDiaUtilModal(false)}
                className="w-full"
              >
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

          {/* Card de status do saque atual */}
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
                    <Badge className={getStatusColor(withdrawal.status)}>
                      {getStatusText(withdrawal.status)}
                    </Badge>
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

      {/* Modal para visualizar nota fiscal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            {receiptImageUrl && (
              <img
                src={receiptImageUrl}
                alt="Nota Fiscal"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReceiptModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => receiptImageUrl && handleDownloadReceipt(receiptImageUrl)}
              className="bg-green-600 hover:bg-green-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsPage;
