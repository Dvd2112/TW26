export const TYPE_LABELS = { participant: 'Normal', volunteer: 'Voluntário', staff: 'Staff' };
export const TYPE_COLORS = { participant: 'default', volunteer: 'purple', staff: 'blue' };

export const PAY_LABELS = {
  pending: 'Aguardando pagamento',
  awaiting_confirmation: 'Em confirmação',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};
export const PAY_COLORS = {
  pending: 'orange',
  awaiting_confirmation: 'gold',
  paid: 'green',
  failed: 'red',
  refunded: 'default',
};

export const REG_LABELS = { pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado' };

export const ACTIVITY_TYPE_LABELS = { palestra: 'Palestra', workshop: 'Workshop', oficina: 'Oficina' };

export const INSTITUTION_LABELS = {
  UTFPR: 'UTFPR', CESUL: 'CESUL', UNIPAR: 'UNIPAR', ensino_medio: 'Ensino Médio', outros: 'Outros',
};
export const institutionLabel = (v) => INSTITUTION_LABELS[v] ?? v;
