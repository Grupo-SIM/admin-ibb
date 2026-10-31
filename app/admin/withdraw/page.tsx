"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/global';
import { Input } from '@/components/ui/input';

type Summary = { unit: 'cents'; walletScope: 'owner' | 'shared-owner'; balanceCents: number; availableBalanceCents: number; lockedBalanceCents: number; pendingPlatformWithdrawalsCents: number };
type Withdrawal = { id: string; amountCents: number; feeCents: number; status: string; pixKey: string; rejectionReason?: string; receiptImage?: string; comprovanteVisivel?: boolean; createdAt: string };
type Config = { withdrawalsEnabled: boolean; withdrawal: { minimumCents: number; fixedFeeCents: number; percentFee: number } };
const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statuses: Record<string, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', COMPLETED: 'Concluído', REJECTED: 'Rejeitado', FAILED: 'Falhou', PROCESSING: 'Processando' };
async function load(path: string, options?: RequestInit) {
  const response = await fetch(`/api/finance/${path}`, { ...options, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Não foi possível carregar os dados financeiros.');
  return data;
}
function receiptUrl(value?: string) {
  try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
export default function WithdrawPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [key, setKey] = useState('');
  async function refresh(current = page) {
    setError('');
    try {
      const [balance, fees, history] = await Promise.all([load('summary'), load('config'), load(`withdrawals?page=${current}&limit=20`)]);
      if (balance.unit !== 'cents' || ![balance.balanceCents, balance.availableBalanceCents, balance.lockedBalanceCents, balance.pendingPlatformWithdrawalsCents, fees.withdrawal.minimumCents, fees.withdrawal.fixedFeeCents].every(Number.isSafeInteger) || !Number.isFinite(fees.withdrawal.percentFee)) throw new Error('Contrato financeiro inválido.');
      setSummary(balance); setConfig(fees); setRows(history.data); setPages(history.meta.totalPages || 1); setPage(current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Serviço indisponível'); setSummary(null); setConfig(null); setRows([]); }
  }
  useEffect(() => { setKey(crypto.randomUUID()); void refresh(1); }, []);
  async function withdraw(event: FormEvent) {
    event.preventDefault();
    if (busy || !summary || !config || !config.withdrawalsEnabled) return;
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount)) { setError('Informe um valor com até duas casas decimais.'); return; }
    const cents = Math.round(Number(amount.replace(',', '.')) * 100);
    if (!Number.isSafeInteger(cents) || cents < config.withdrawal.minimumCents || cents > summary.availableBalanceCents || !pixKey.trim()) { setError('Confira valor mínimo, saldo e chave PIX.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await load('withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCents: cents, pixKey: pixKey.trim(), idempotencyKey: key }) });
      setNotice('Solicitação de saque registrada.'); setAmount(''); setPixKey(''); setKey(crypto.randomUUID()); await refresh(1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha no saque'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Carteira e saques — Bosque</h1><Button onClick={() => refresh()} disabled={busy}>Atualizar</Button></div>
    {error && <p role="alert" className="rounded border p-4">{error} Nenhum saldo estimado será exibido.</p>}
    {notice && <p role="status">{notice}</p>}
    {summary && <section className="space-y-2 rounded border p-4"><h2 className="font-semibold">Carteira do ledger</h2><p>Saldo: {money(summary.balanceCents)}</p><p>Disponível: {money(summary.availableBalanceCents)}</p><p>Bloqueado: {money(summary.lockedBalanceCents)}</p><p>Saques pendentes da plataforma: {money(summary.pendingPlatformWithdrawalsCents)}</p><p>Escopo: {summary.walletScope === 'shared-owner' ? 'carteira compartilhada do proprietário' : 'carteira do proprietário'}. Este saldo não constitui reconciliação econômica.</p></section>}
    {config && !config.withdrawalsEnabled && <p role="status">Saques bloqueados até aprovação da reconciliação financeira.</p>}
    <form onSubmit={withdraw} className="space-y-4 rounded border p-4"><h2 className="font-semibold">Solicitar saque</h2>{config && <p>Mínimo: {money(config.withdrawal.minimumCents)}. Taxa fixa: {money(config.withdrawal.fixedFeeCents)}. Taxa percentual: {config.withdrawal.percentFee * 100}%. Valores finais sujeitos à validação do servidor.</p>}<label className="block">Valor bruto em reais (debitado da carteira)<Input value={amount} inputMode="decimal" onChange={e => { setAmount(e.target.value); setKey(crypto.randomUUID()); }} disabled={busy} required /></label><label className="block">Chave PIX<Input value={pixKey} onChange={e => { setPixKey(e.target.value); setKey(crypto.randomUUID()); }} maxLength={200} disabled={busy} required /></label><Button type="submit" disabled={busy || !summary || !config || !config.withdrawalsEnabled || !key}>{busy ? 'Enviando…' : 'Solicitar saque'}</Button></form>
    <section className="space-y-3"><h2 className="font-semibold">Histórico de saques</h2><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Data', 'Valor', 'Taxa', 'Situação', 'Chave PIX', 'Comprovante'].map(title => <th className="p-2" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="p-2">{new Date(row.createdAt).toLocaleString('pt-BR')}</td><td className="p-2">{money(row.amountCents)}</td><td className="p-2">{money(row.feeCents)}</td><td className="p-2">{statuses[row.status] || 'Situação não reconhecida'}{row.rejectionReason && <p>{row.rejectionReason}</p>}</td><td className="break-all p-2">{row.pixKey}</td><td className="p-2">{row.comprovanteVisivel && receiptUrl(row.receiptImage) ? <a href={receiptUrl(row.receiptImage)!} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Abrir comprovante</a> : 'Indisponível'}</td></tr>)}</tbody></table></div>{!rows.length && <p>Nenhum saque disponível.</p>}<div className="flex items-center gap-3"><Button disabled={page <= 1} onClick={() => refresh(page - 1)}>Anterior</Button><span>{page} / {pages}</span><Button disabled={page >= pages} onClick={() => refresh(page + 1)}>Próxima</Button></div></section>
  </main>;
}
