export const VOLUNTEER_ROLE_OPTIONS = [
  { label: 'Credenciamento', value: 'credenciamento' },
  { label: 'Montagem', value: 'montagem' },
  { label: 'Hackathon', value: 'hackathon' },
];
export const EVENT_DAY_OPTIONS = ['19', '20', '21', '22'].map((d) => ({ label: `Dia ${d}`, value: d }));
export const HACKATHON_DAY_OPTIONS = ['17', '18'].map((d) => ({ label: `Dia ${d}`, value: d }));

export const VOLUNTEER_STATUS_LABELS = { pending: 'Em análise', approved: 'Aprovada', rejected: 'Não aprovada' };
export const VOLUNTEER_STATUS_COLORS = { pending: 'gold', approved: 'green', rejected: 'red' };

export const TYPE_LABELS = {
  participant: 'Participante',
  volunteer: 'Voluntário',
  staff: 'Staff',
};

export const PAYMENT_LABELS = {
  pending: 'Aguardando pagamento',
  awaiting_confirmation: 'Pagamento em confirmação',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};

export const PAYMENT_COLORS = {
  pending: 'orange',
  awaiting_confirmation: 'gold',
  paid: 'green',
  failed: 'red',
  refunded: 'default',
};

export const REG_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};
