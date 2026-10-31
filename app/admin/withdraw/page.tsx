"use client";
import React, { useEffect, useState } from "react";

import { Wallet, RefreshCw, DollarSign, ArrowUpRight, ArrowDownLeft, History, FileText, Download, Eye, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
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
import { toast } from 'react-toastify';

function cents(value: unknown): number {
    if (!Number.isSafeInteger(value)) throw new Error("Contrato financeiro inválido.");
    return (value as number) / 100;
}
async function financeRequest(resource: string) {
    const response = await fetch("/api/finance/" + resource, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Serviço financeiro indisponível.");
    return data;
}

interface PlatformFees {
    taxaFixa: number;
    taxaPercent: number;
    saqueMin: number;
}

interface FinancialSummary {
    availableBalance: number;
    pendingWithdraws: number;
    lockedBalance: number;
    netLockedBalance?: string | number;
}

interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    status: "PENDING" | "COMPLETED" | "FAILED" | "APPROVED" | "REJECTED";
    pixKey: string;
    receiptImage?: string;
    comprovanteVisivel?: boolean;
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
    meta: {
        currentPage: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
    };
}

const WithdrawPage = () => {
    const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [withdrawalsPaginationMeta, setWithdrawalsPaginationMeta] = useState({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 1,
    });
    const [activeTab, setActiveTab] = useState("summary");

    // Estados para saque
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [withdrawalAmount, setWithdrawalAmount] = useState("");
    const [pixKey, setPixKey] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [noDiaUtilModal, setNoDiaUtilModal] = useState(false);
    const [feriadoInfo, setFeriadoInfo] = useState<{ name: string } | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [selectedReceiptImage, setSelectedReceiptImage] = useState("");
    const [receiptImgError, setReceiptImgError] = useState(false);
    const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);
    const [pendingWithdrawal, setPendingWithdrawal] = useState<Withdrawal | null>(null);
    // Policy, receipts and synchronization are not exposed by this platform's authenticated API.
    const platformFees = { taxaFixa: NaN, taxaPercent: NaN, saqueMin: NaN };
    const withdrawalsEnabled = false;
    const isSyncing = false;
    const handleSyncWithdrawals = () => toast.info("Sincronização indisponível na API financeira autenticada.");
    const fetchPlatformFees = async () => {};
    const fetchFinancialSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await financeRequest("summary");
            setFinancialSummary({ availableBalance: cents(data.availableBalanceCents),
                pendingWithdraws: cents(data.pendingPlatformWithdrawalsCents),
                lockedBalance: cents(data.lockedBalanceCents) });
        } catch (err: any) { setError(err.message || "Falha ao buscar resumo financeiro."); }
        finally { setLoading(false); }
    };
    const fetchWithdrawals = async (page = 1) => {
        try {
            const data = await financeRequest(`withdrawals?page=${page}&limit=10`);
            const items = data.data.map((item: any) => ({ ...item,
                amount: cents(item.amountCents), fee: String(cents(item.feeCents)), receiptImage: undefined, comprovanteVisivel: false }));
            setWithdrawals(items);
            checkPendingWithdrawal(items);
            setWithdrawalsPaginationMeta({ currentPage: data.meta.page, itemsPerPage: data.meta.limit,
                totalItems: data.meta.total, totalPages: data.meta.totalPages });
        } catch (err: any) { toast.error(err.message || "Falha ao carregar histórico de saques."); }
    };
    useEffect(() => { fetchFinancialSummary(); fetchWithdrawals(); }, []);

    const checkPendingWithdrawal = (withdrawals: Withdrawal[]) => {
        // Procurar por saque pendente (apenas PENDING)
        const pending = withdrawals.find(w => w.status === "PENDING");

        if (pending) {
            setHasPendingWithdrawal(true);
            setPendingWithdrawal(pending);
        } else {
            setHasPendingWithdrawal(false);
            setPendingWithdrawal(null);
        }
    };

    const formatCurrency = (value: number) => {
        if (!Number.isFinite(value)) return "Indisponível";
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const downloadImage = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'nota-fiscal.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Erro ao baixar imagem:', error);
            toast.error('Erro ao baixar a nota fiscal');
        }
    };

    const openReceiptModal = (imageUrl: string) => {
        setSelectedReceiptImage(imageUrl);
        setIsReceiptModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("pt-BR");
    };

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
        return day === 0 || day === 6; // 0 = domingo, 6 = sábado
    };

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

    const handleWithdrawalRequest = async () => {
        toast.info("Saques indisponíveis: política de taxas não fornecida pela API autenticada.");
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-black/40 dark:text-white/40" />
                    <span className="text-sm text-black/50 dark:text-white/50">Carregando dados financeiros...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 max-w-xs w-full text-center p-6 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] backdrop-blur-sm">
                    <Wallet className="w-8 h-8 text-red-500/50" />
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Erro ao carregar dados</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">{error}</p>
                    <button
                        onClick={fetchFinancialSummary}
                        className="mt-1 px-4 py-1.5 text-xs rounded-lg border border-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-black/[0.06] dark:bg-white/[0.06]">
                        <Wallet className="w-5 h-5 text-black dark:text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-black dark:text-white">Saque</h1>
                        <p className="text-xs text-black/50 dark:text-white/50">Gerencie seus saques e visualize seu saldo</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { fetchFinancialSummary(); fetchWithdrawals(withdrawalsPaginationMeta.currentPage); }}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                    </Button>
                    <Button size="sm" onClick={() => setIsModalOpen(true)}>
                        <Wallet className="w-4 h-4 mr-2" />
                        Solicitar Saque
                    </Button>
                </div>
            </div>

            {/* Aviso sobre dias úteis */}
            <div className="flex items-start gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] p-4">
                <Info className="h-4 w-4 text-black/40 dark:text-white/40 shrink-0 mt-0.5" />
                <p className="text-sm text-black/60 dark:text-white/60">
                    Atenção: As solicitações de saque são processadas em até 48 horas apenas em dias úteis.
                </p>
            </div>

            {/* Banner de Saque Pendente */}
            {hasPendingWithdrawal && pendingWithdrawal && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] backdrop-blur-sm p-4">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Saque Pendente de Aprovação</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                            Você possui um saque de <strong>{formatCurrency(pendingWithdrawal.amount)}</strong> aguardando aprovação.
                        </p>
                    </div>
                </div>
            )}

            {/* Abas */}
            <div className="border-b border-black/[0.08] dark:border-white/[0.08]">
                <nav className="-mb-px flex space-x-6">
                    {[
                        { key: "summary", icon: <Wallet className="w-4 h-4" />, label: "Resumo" },
                        { key: "history", icon: <History className="w-4 h-4" />, label: "Histórico de Saques" },
                    ].map(({ key, icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 py-2 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === key
                                ? "border-black dark:border-white text-black dark:text-white"
                                : "border-transparent text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70"
                            }`}
                        >
                            {icon}<span>{label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === "summary" && (
                <>
                    {/* Cards de Saldo */}
                    {financialSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { icon: <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, iconBg: "bg-emerald-500/10", label: "Saldo disponível", value: formatCurrency(financialSummary.availableBalance) },
                                { icon: <ArrowUpRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />, iconBg: "bg-amber-500/10", label: "Saque em processo", value: formatCurrency(Number(financialSummary.netLockedBalance ?? financialSummary.pendingWithdraws)) },
                                { icon: <ArrowDownLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />, iconBg: "bg-blue-500/10", label: "Saldo em processamento", value: formatCurrency(financialSummary.lockedBalance) },
                            ].map(({ icon, iconBg, label, value }) => (
                                <div key={label} className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl p-5 flex items-center gap-4">
                                    <div className={`p-2.5 rounded-lg ${iconBg}`}>{icon}</div>
                                    <div>
                                        <p className="text-xs font-medium text-black/50 dark:text-white/50">{label}</p>
                                        <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Taxas da Plataforma */}
                    <div className="flex items-start gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] p-4">
                        <Info className="h-4 w-4 text-black/40 dark:text-white/40 shrink-0 mt-0.5" />
                        <div className="text-sm text-black/60 dark:text-white/60 space-y-1">
                            <p>
                                <span className="font-medium text-black dark:text-white">Taxa de saque:</span>{" "}
                                {formatCurrency(platformFees.taxaFixa)}
                                {platformFees.taxaPercent > 0 ? ` + ${(platformFees.taxaPercent * 100).toFixed(2)}% do valor` : ""}
                            </p>
                            <p>
                                <span className="font-medium text-black dark:text-white">Valor mínimo:</span>{" "}
                                {formatCurrency(platformFees.saqueMin)}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {activeTab === "history" && (
                <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-black dark:text-white">Histórico de Saques</h3>
                        <Button variant="outline" size="sm" onClick={handleSyncWithdrawals} disabled={!withdrawalsEnabled || isSyncing}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                            {isSyncing ? "Sincronizando..." : "Sincronizar"}
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-black/[0.06] dark:border-white/[0.06]">
                                    {["Data","Nome","Email","Valor","Chave PIX","Status","Nota Fiscal"].map((h) => (
                                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map((withdrawal, i) => {
                                    const statusMap: Record<string, { label: string; cls: string }> = {
                                        // Saque aprovado é tratado/exibido como Concluído (verde), igual ao COMPLETED.
                                        COMPLETED: { label: "Concluído",            cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" },
                                        APPROVED:  { label: "Concluído",            cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" },
                                        PENDING:   { label: "Aguardando Aprovação", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20" },
                                        FAILED:    { label: "Falhou",               cls: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20" },
                                        REJECTED:  { label: "Recusado",             cls: "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20" },
                                    };
                                    const badge = statusMap[withdrawal.status] ?? { label: withdrawal.status, cls: "bg-black/[0.06] dark:bg-white/[0.06] text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10" };
                                    return (
                                        <tr key={withdrawal.id} className={`border-b border-black/[0.04] dark:border-white/[0.04] ${i % 2 === 0 ? "" : "bg-black/[0.01] dark:bg-white/[0.01]"} hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-black/60 dark:text-white/60">{new Date(withdrawal.createdAt).toLocaleDateString("pt-BR")}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black dark:text-white">{withdrawal.user?.name ?? "Indisponível"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black/70 dark:text-white/70">{withdrawal.user?.email ?? "Indisponível"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black dark:text-white">{formatCurrency(withdrawal.amount)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black/70 dark:text-white/70 font-mono">{withdrawal.pixKey}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${badge.cls}`}>{badge.label}</span>
                                                    {withdrawal.status === "REJECTED" && withdrawal.rejectionReason && (
                                                        <Tooltip content={withdrawal.rejectionReason}>
                                                            <Info className="w-4 h-4 text-red-500/70 cursor-help" />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {withdrawal.receiptImage && withdrawal.comprovanteVisivel !== false ? (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => { setReceiptImgError(false); openReceiptModal(withdrawal.receiptImage!); }}>
                                                                <Eye className="w-3 h-3 mr-1" />Ver
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => downloadImage(withdrawal.receiptImage!, `nota-fiscal-${withdrawal.id.slice(-8)}`)}>
                                                                <Download className="w-3 h-3 mr-1" />Baixar
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <span className="text-black/30 dark:text-white/30 text-xs">Não disponível</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {withdrawals.length === 0 && (
                            <div className="text-center py-12">
                                <History className="mx-auto h-10 w-10 text-black/20 dark:text-white/20 mb-3" />
                                <p className="text-sm font-medium text-black/50 dark:text-white/50">Nenhum saque encontrado</p>
                                <p className="text-xs text-black/30 dark:text-white/30 mt-1">Não há histórico de saques para exibir.</p>
                            </div>
                        )}
                    </div>
                    {withdrawalsPaginationMeta.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.06] px-6 py-3">
                            <p className="text-sm text-black/50 dark:text-white/50">
                                Mostrando <span className="font-medium text-black dark:text-white">{((withdrawalsPaginationMeta.currentPage - 1) * withdrawalsPaginationMeta.itemsPerPage) + 1}</span>–<span className="font-medium text-black dark:text-white">{Math.min(withdrawalsPaginationMeta.currentPage * withdrawalsPaginationMeta.itemsPerPage, withdrawalsPaginationMeta.totalItems)}</span> de <span className="font-medium text-black dark:text-white">{withdrawalsPaginationMeta.totalItems}</span> saques
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(withdrawalsPaginationMeta.currentPage - 1)} disabled={withdrawalsPaginationMeta.currentPage <= 1}>Anterior</Button>
                                <span className="text-xs text-black/50 dark:text-white/50 tabular-nums">{withdrawalsPaginationMeta.currentPage} / {withdrawalsPaginationMeta.totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(withdrawalsPaginationMeta.currentPage + 1)} disabled={withdrawalsPaginationMeta.currentPage >= withdrawalsPaginationMeta.totalPages}>Próxima</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Saque */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Solicitar Saque</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {hasPendingWithdrawal && (
                            <div className="p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.20] backdrop-blur-sm">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium text-center">
                                    Você já possui um saque pendente. Aguarde a aprovação antes de solicitar um novo.
                                </p>
                            </div>
                        )}

                        {(isWeekend(new Date()) || feriadoInfo) && !hasPendingWithdrawal && (
                            <div className="p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.20] backdrop-blur-sm">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium text-center">
                                    {isWeekend(new Date())
                                        ? "Atenção! Hoje é final de semana. O processamento iniciará no próximo dia útil."
                                        : `Atenção! Hoje é ${feriadoInfo?.name || 'feriado'}. O processamento iniciará no próximo dia útil.`}
                                </p>
                            </div>
                        )}

                        {/* Valor */}
                        <div className="space-y-1.5">
                            <Label htmlFor="amount">Valor</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-black/50 dark:text-white/50">R$</span>
                                <Input
                                    id="amount"
                                    type="text"
                                    value={withdrawalAmount}
                                    onChange={handleAmountChange}
                                    disabled={!withdrawalsEnabled || hasPendingWithdrawal}
                                    className={`pl-9 ${hasPendingWithdrawal ? "opacity-50 cursor-not-allowed" : ""} ${parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0) ? "border-red-500/50" : ""}`}
                                    placeholder="0,00"
                                />
                            </div>
                            <p className="text-xs text-black/50 dark:text-white/50">
                                Saldo disponível: <span className="font-medium text-black dark:text-white">{formatCurrency(financialSummary?.availableBalance || 0)}</span>
                            </p>
                        </div>

                        {/* PIX */}
                        <div className="space-y-1.5">
                            <Label htmlFor="pixKey">Chave PIX (CPF/CNPJ)</Label>
                            <Input
                                id="pixKey"
                                type="text"
                                value={pixKey}
                                onChange={handlePixKeyChange}
                                disabled={!withdrawalsEnabled || hasPendingWithdrawal}
                                className={hasPendingWithdrawal ? "opacity-50 cursor-not-allowed" : ""}
                                placeholder="Digite seu CPF ou CNPJ"
                            />
                        </div>

                        {/* Info taxas */}
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
                                !withdrawalsEnabled ||
                                hasPendingWithdrawal ||
                                isWithdrawing ||
                                !withdrawalAmount ||
                                !pixKey ||
                                parseFloat(withdrawalAmount) < platformFees.saqueMin ||
                                parseFloat(withdrawalAmount) > (financialSummary?.availableBalance || 0)
                            }
                        >
                            {isWithdrawing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                                    Processando...
                                </>
                            ) : hasPendingWithdrawal ? (
                                "Saque Pendente"
                            ) : (
                                "Confirmar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Dia Não Útil */}
            <Dialog open={noDiaUtilModal} onOpenChange={setNoDiaUtilModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aviso Importante</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-black/70 dark:text-white/70 text-center">
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

            {/* Modal de Visualização da Nota Fiscal */}
            <Dialog open={isReceiptModalOpen} onOpenChange={(open) => { setIsReceiptModalOpen(open); if (!open) setReceiptImgError(false); }}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span>Nota Fiscal</span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 py-4">
                        {selectedReceiptImage && (
                            receiptImgError ? (
                                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                                    <FileText className="w-16 h-16 text-gray-300" />
                                    <p className="text-gray-500">Não foi possível exibir a imagem</p>
                                    <a href={selectedReceiptImage} target="_blank" rel="noopener noreferrer"
                                        className="text-sm text-blue-600 underline hover:text-blue-800">
                                        Abrir em nova aba
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={selectedReceiptImage}
                                    alt="Nota Fiscal"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg border shadow-lg"
                                    onError={() => setReceiptImgError(true)}
                                />
                            )
                        )}
                    </div>
                    <DialogFooter className="flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsReceiptModalOpen(false)}
                            className="flex-1"
                        >
                            Fechar
                        </Button>
                        {selectedReceiptImage && !receiptImgError && (
                            <Button
                                onClick={() => downloadImage(selectedReceiptImage, `nota-fiscal-${Date.now()}.png`)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WithdrawPage;
