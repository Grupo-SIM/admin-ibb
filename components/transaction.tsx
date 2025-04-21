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
import { useToast } from "@/hooks/use-toast";
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
  createdAt: string;
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
    APPROVED: "bg-green-100 text-green-800",
  };
  return statusColors[status] || "bg-gray-100 text-gray-800";
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
  const { toast } = useToast();
  const API_URL = "https://api-dom.jbmidia.com";

  const [walletPerDescription, setWalletPerDescription] = useState<{
    [key: string]: number;
  }>({
    oferta: 0,
    primícia: 0,
    dizimo: 0,
    fundação: 0,
  });

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

      toast({
        title: "Sucesso",
        description: "Arquivo Excel exportado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar o arquivo Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar o resumo financeiro.",
        variant: "destructive",
      });
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações.",
        variant: "destructive",
      });
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
      toast({
        title: "Erro",
        description: "Não foi possível carregar os saques.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido.",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma chave PIX válida.",
        variant: "destructive",
      });
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

      if (!response.ok) throw new Error("Falha ao solicitar saque");

      toast({
        title: "Sucesso",
        description: "Solicitação de saque enviada com sucesso!",
      });

      setIsModalOpen(false);
      setWithdrawalAmount("");
      setPixKey("");
      fetchWithdrawals(withdrawalsPaginationMeta.currentPage);
      fetchFinancialSummary();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível solicitar o saque.",
        variant: "destructive",
      });
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
                    {transaction.status}
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
                    {withdrawal.status}
                  </Badge>
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
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
          </TabsList>

          <div className="flex gap-4">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Solicitar Saque
            </Button>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                      className={`pl-8 ${
                        parseFloat(withdrawalAmount.replace(",", ".")) >
                        financialSummary.availableBalance - 2
                          ? "border-red-500 focus:ring-red-500"
                          : ""
                      }`}
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Saldo máximo para saque: R${" "}
                    {(financialSummary.availableBalance - 1)
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
                  !withdrawalAmount ||
                  !pixKey ||
                  parseFloat(withdrawalAmount.replace(",", ".")) >
                    financialSummary.availableBalance - 1 ||
                  parseFloat(withdrawalAmount.replace(",", ".")) <= 0
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  "Confirmar"
                )}
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
                      <SelectItem value="COMPLETED">Completado</SelectItem>
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
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            renderWithdrawalsTable()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionsPage;
