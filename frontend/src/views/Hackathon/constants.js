export const MEMBER_PAYMENT_LABELS = {
  free: 'Isento',
  unpaid: 'Aguardando pagamento',
  awaiting_confirmation: 'Comprovante em análise',
  paid: 'Pago',
};

export const MEMBER_PAYMENT_COLORS = {
  free: 'blue',
  unpaid: 'orange',
  awaiting_confirmation: 'gold',
  paid: 'green',
};

export const INVITE_LABELS = {
  pending: 'Aguardando aceite',
  accepted: 'Vínculo aceito',
  rejected: 'Rejeitou',
};

export const INVITE_COLORS = {
  pending: 'gold',
  accepted: 'green',
  rejected: 'red',
};

export function formatCPF(value) {
  const d = String(value ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export const formatMoney = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
