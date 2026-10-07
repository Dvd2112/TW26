import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Select, Input, DatePicker, Row, Col, Space, Statistic, Alert, Tag, message } from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileSearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import ResponsiveTable from '../shared/ResponsiveTable';
import { TYPE_LABELS, REG_LABELS, ACTIVITY_TYPE_LABELS, INSTITUTION_LABELS } from '../shared/constants';

const { RangePicker } = DatePicker;

const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const YES_NO = [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }];
const INSTITUTIONS = toOptions(INSTITUTION_LABELS);
const PAYMENT_OPTIONS = toOptions({
  unpaid: 'Não pago', awaiting_confirmation: 'Em confirmação', paid: 'Pago', refunded: 'Reembolsado',
});
const PERMISSION_OPTIONS = toOptions({
  super_admin: 'Super admin', content_admin: 'Admin de conteúdo',
  registration_admin: 'Admin de inscrições', credentialer: 'Credenciador',
});

/**
 * Cada relatório declara seus filtros (nome = query param do backend). Os filtros
 * seguem os atributos de cada entidade; `range` vira dois params (`from`/`to`).
 */
const REPORTS = {
  registrations: {
    label: 'Inscritos',
    filters: [
      { name: 'range', label: 'Período da inscrição', kind: 'range' },
      { name: 'lote_id', label: 'Lote', kind: 'select', multiple: true, dynamic: 'lotes' },
      { name: 'status', label: 'Status', kind: 'select', multiple: true, options: toOptions(REG_LABELS) },
      { name: 'payment_status', label: 'Pagamento', kind: 'select', multiple: true, options: PAYMENT_OPTIONS },
      { name: 'participant_type', label: 'Tipo', kind: 'select', multiple: true, options: toOptions(TYPE_LABELS) },
      { name: 'institution', label: 'Instituição', kind: 'select', multiple: true, options: INSTITUTIONS },
      { name: 'school', label: 'Escola (ensino médio)', kind: 'text' },
      { name: 'came_from_presave', label: 'Veio do pré-save', kind: 'select', options: YES_NO },
      { name: 'q', label: 'Nome ou e-mail', kind: 'text' },
    ],
  },
  lotes: {
    label: 'Lotes',
    filters: [
      { name: 'range', label: 'Início do lote', kind: 'range' },
      { name: 'participant_type', label: 'Tipo', kind: 'select', multiple: true, options: toOptions(TYPE_LABELS) },
      { name: 'institution', label: 'Instituição', kind: 'select', multiple: true, options: INSTITUTIONS },
      { name: 'is_active', label: 'Ativo', kind: 'select', options: YES_NO },
      { name: 'q', label: 'Nome do lote', kind: 'text' },
    ],
  },
  users: {
    label: 'Usuários',
    filters: [
      { name: 'range', label: 'Período do cadastro', kind: 'range' },
      { name: 'participant_type', label: 'Tipo', kind: 'select', multiple: true, options: toOptions(TYPE_LABELS) },
      { name: 'institution', label: 'Instituição', kind: 'select', multiple: true, options: INSTITUTIONS },
      { name: 'school', label: 'Escola (ensino médio)', kind: 'text' },
      { name: 'permission', label: 'Permissão', kind: 'select', multiple: true, options: PERMISSION_OPTIONS },
      { name: 'email_verified', label: 'E-mail verificado', kind: 'select', options: YES_NO },
      { name: 'has_registration', label: 'Possui inscrição', kind: 'select', options: YES_NO },
      { name: 'q', label: 'Nome ou e-mail', kind: 'text' },
    ],
  },
  activities: {
    label: 'Atividades',
    filters: [
      { name: 'range', label: 'Período da atividade', kind: 'range' },
      { name: 'activity_type', label: 'Tipo', kind: 'select', multiple: true, options: toOptions(ACTIVITY_TYPE_LABELS) },
      { name: 'is_published', label: 'Publicada', kind: 'select', options: YES_NO },
      { name: 'early_access', label: 'Acesso antecipado', kind: 'select', options: YES_NO },
      { name: 'q', label: 'Título, palestrante ou local', kind: 'text' },
    ],
  },
  financeiro: {
    label: 'Financeiro (prestação de contas)',
    filters: [
      { name: 'range', label: 'Período', kind: 'range' },
      { name: 'kind', label: 'Movimento', kind: 'select', options: [{ value: 'entrada', label: 'Entradas' }, { value: 'saida', label: 'Saídas' }] },
      { name: 'category', label: 'Categoria', kind: 'text' },
      { name: 'q', label: 'Descrição', kind: 'text' },
    ],
  },
};

const money = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const datetime = (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '');

/** Formatação para exibição na tela (CSV usa valores crus, ver csvValue). */
const FORMATTERS = {
  money,
  datetime,
  int: (v) => (v ?? ''),
  percent: (v) => (v === null || v === undefined ? '' : `${String(v).replace('.', ',')}%`),
};
const display = (col, v) => (FORMATTERS[col.type] ? FORMATTERS[col.type](v) : (v ?? ''));

/** CSV: números com vírgula decimal e `;` como separador (padrão do Excel pt-BR). */
function csvValue(col, v) {
  if (v === null || v === undefined) return '';
  let text;
  if (col.type === 'datetime') text = datetime(v);
  else if (col.type === 'money' || col.type === 'percent') text = Number(v).toFixed(2).replace('.', ',');
  else text = String(v);
  // Evita injeção de fórmula ao abrir no Excel (=, +, -, @ no início de texto livre).
  if (!col.type && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const isEmpty = (v) => v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

/** Descreve os filtros usados (rótulo + valores legíveis) para exibir no relatório e no CSV. */
function describeFilters(def, values, lotes) {
  return def.filters.flatMap((f) => {
    const v = values[f.name];
    if (isEmpty(v)) return [];
    if (f.kind === 'range') {
      const [from, to] = v;
      const text = [from && `a partir de ${from.format('DD/MM/YYYY')}`, to && `até ${to.format('DD/MM/YYYY')}`].filter(Boolean).join(' ');
      return text ? [{ label: f.label, text }] : [];
    }
    if (f.kind === 'select') {
      const options = f.dynamic === 'lotes' ? lotes : f.options;
      const picked = [].concat(v).map((x) => options.find((o) => o.value === x)?.label ?? x);
      return [{ label: f.label, text: picked.join(', ') }];
    }
    return [{ label: f.label, text: String(v).trim() }];
  });
}

function downloadCsv(report, filename) {
  const filterLines = report.applied.length
    ? report.applied.map((f) => csvValue({}, `${f.label}: ${f.text}`))
    : [csvValue({}, 'Sem filtros (todos os registros)')];
  const preamble = [
    csvValue({}, report.title),
    csvValue({}, `Gerado em ${datetime(report.generated_at)}`),
    csvValue({}, 'Filtros aplicados:'),
    ...filterLines,
    '',
  ];
  const header = report.columns.map((c) => csvValue({}, c.title)).join(';');
  const lines = report.rows.map((row) => report.columns.map((c) => csvValue(c, row[c.key])).join(';'));
  // BOM para o Excel reconhecer UTF-8.
  const blob = new Blob([`\uFEFF${[...preamble, header, ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** PDF A4 paisagem: cabeçalho, filtros aplicados, resumo e tabela. jsPDF é carregado só ao exportar. */
async function downloadPdf(report, filename) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  const width = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold').setFontSize(16).text(`TechWeek 2026 — ${report.title}`, margin, 40);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
  doc.text(`Gerado em ${datetime(report.generated_at)}`, margin, 56);
  const filters = report.applied.length
    ? report.applied.map((f) => `${f.label}: ${f.text}`).join('  |  ')
    : 'Sem filtros (todos os registros)';
  const filterLines = doc.splitTextToSize(`Filtros aplicados: ${filters}`, width - margin * 2);
  doc.text(filterLines, margin, 70);
  const afterFilters = 70 + filterLines.length * 11;

  autoTable(doc, {
    startY: afterFilters + 6,
    head: [['Resumo', 'Valor']],
    body: report.summary.map((s) => [s.label, FORMATTERS[s.type](s.value)]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [138, 0, 196] },
    tableWidth: 300,
    margin: { left: margin, right: margin },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [report.columns.map((c) => c.title)],
    body: report.rows.map((row) => report.columns.map((c) => String(display(c, row[c.key])))),
    theme: 'striped',
    styles: { fontSize: report.columns.length > 10 ? 6.5 : 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [138, 0, 196] },
    columnStyles: Object.fromEntries(
      report.columns.map((c, i) => [i, ['money', 'int', 'percent'].includes(c.type) ? { halign: 'right' } : {}]),
    ),
    margin: { left: margin, right: margin, bottom: 30 },
    showHead: 'everyPage',
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8).setTextColor(120);
    doc.text(`Página ${i} de ${pages}`, width - margin, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
  }
  doc.save(filename);
}

export default function ReportsTab({ perms = [] }) {
  const [available, setAvailable] = useState(null);
  const [kind, setKind] = useState(null);
  const [values, setValues] = useState({});
  const [lotes, setLotes] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    axios.get('/TW26/backend/api/admin/reports.php')
      .then((res) => {
        const list = res.data.available ?? [];
        setAvailable(list);
        setKind((cur) => cur ?? list[0] ?? null);
      })
      .catch((err) => {
        setAvailable([]);
        message.error(err.response?.data?.message ?? 'Erro ao carregar relatórios.');
      });
  }, []);

  // Lotes alimentam o filtro do relatório de inscritos; só quem enxerga inscrições os lista.
  useEffect(() => {
    if (!perms.some((p) => p === 'super_admin' || p === 'registration_admin')) return;
    axios.get('/TW26/backend/api/admin/lotes.php')
      .then((res) => setLotes((res.data.lotes ?? []).map((l) => ({ value: String(l.id), label: l.name }))))
      .catch(() => {});
  }, [perms]);

  const changeKind = (k) => {
    setKind(k);
    setValues({});
    setReport(null);
  };

  const setValue = (name, v) => setValues((cur) => ({ ...cur, [name]: v }));

  const params = useMemo(() => {
    const p = { report: kind };
    Object.entries(values).forEach(([name, v]) => {
      if (name === 'range') {
        if (v?.[0]) p.from = v[0].format('YYYY-MM-DD');
        if (v?.[1]) p.to = v[1].format('YYYY-MM-DD');
      } else if (!isEmpty(v)) {
        p[name] = Array.isArray(v) ? v : String(v).trim();
      }
    });
    return p;
  }, [kind, values]);

  const generate = () => {
    setLoading(true);
    axios.get('/TW26/backend/api/admin/reports.php', { params })
      .then((res) => setReport({ ...res.data, applied: describeFilters(REPORTS[kind], values, lotes) }))
      .catch((err) => {
        setReport(null);
        message.error(err.response?.data?.message ?? 'Erro ao gerar o relatório.');
      })
      .finally(() => setLoading(false));
  };

  const exportPdf = () => {
    setExportingPdf(true);
    downloadPdf(report, `relatorio-${kind}-${dayjs().format('YYYYMMDD-HHmm')}.pdf`)
      .catch(() => message.error('Erro ao gerar o PDF.'))
      .finally(() => setExportingPdf(false));
  };

  if (available === null) return <p className={styles.muted}>Carregando...</p>;
  if (available.length === 0) return <p className={styles.muted}>Você não tem acesso a nenhum relatório.</p>;

  const def = REPORTS[kind];
  const columns = report?.columns.map((c) => ({
    title: c.title,
    dataIndex: c.key,
    render: (v) => display(c, v),
    align: ['money', 'int', 'percent'].includes(c.type) ? 'right' : undefined,
  }));

  const renderFilter = (f) => {
    const common = { style: { width: '100%' }, placeholder: f.label };
    if (f.kind === 'range') {
      return <RangePicker {...common} placeholder={['De', 'Até']} format="DD/MM/YYYY" value={values.range ?? null} onChange={(v) => setValue('range', v)} />;
    }
    if (f.kind === 'select') {
      return (
        <Select
          {...common}
          allowClear
          mode={f.multiple ? 'multiple' : undefined}
          maxTagCount="responsive"
          optionFilterProp="label"
          options={f.dynamic === 'lotes' ? lotes : f.options}
          value={values[f.name] ?? (f.multiple ? [] : undefined)}
          onChange={(v) => setValue(f.name, v)}
        />
      );
    }
    return <Input {...common} allowClear value={values[f.name] ?? ''} onChange={(e) => setValue(f.name, e.target.value)} onPressEnter={generate} />;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Gerar relatório">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%' }}
              value={kind}
              onChange={changeKind}
              options={available.map((k) => ({ value: k, label: REPORTS[k].label }))}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {def.filters.map((f) => (
            <Col xs={24} md={f.kind === 'range' ? 8 : 6} key={f.name}>
              <div className={styles.muted} style={{ fontSize: 12, marginBottom: 4 }}>{f.label}</div>
              {renderFilter(f)}
            </Col>
          ))}
        </Row>
        <Space style={{ marginTop: 20 }} wrap>
          <Button type="primary" icon={<FileSearchOutlined />} loading={loading} onClick={generate} style={{ background: '#8A00C4', border: 'none' }}>
            Gerar relatório
          </Button>
          <Button onClick={() => { setValues({}); setReport(null); }}>Limpar filtros</Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!report || report.rows.length === 0}
            onClick={() => downloadCsv(report, `relatorio-${kind}-${dayjs().format('YYYYMMDD-HHmm')}.csv`)}
          >
            Exportar CSV
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            loading={exportingPdf}
            disabled={!report || report.rows.length === 0}
            onClick={exportPdf}
          >
            Exportar PDF
          </Button>
        </Space>
      </Card>

      {report && (
        <>
          {report.truncated && (
            <Alert type="warning" showIcon message="O relatório tem mais de 10.000 linhas; apenas as primeiras foram exibidas. Refine os filtros." />
          )}
          <Card title={`${report.title} — gerado em ${datetime(report.generated_at)}`}>
            <div style={{ marginBottom: 16 }}>
              <span className={styles.muted} style={{ marginRight: 8 }}>Filtros aplicados:</span>
              {report.applied.length === 0
                ? <Tag>Nenhum — todos os registros</Tag>
                : report.applied.map((f) => (
                  <Tag key={f.label} color="purple" style={{ whiteSpace: 'normal', marginBottom: 4 }}>
                    {f.label}: <strong>{f.text}</strong>
                  </Tag>
                ))}
            </div>
            <Row gutter={[16, 16]}>
              {report.summary.map((s) => (
                <Col xs={12} md={6} key={s.label}>
                  <Statistic
                    title={s.label}
                    value={FORMATTERS[s.type](s.value)}
                    valueStyle={{ color: '#fff', fontSize: 20 }}
                  />
                </Col>
              ))}
            </Row>
          </Card>
          <ResponsiveTable
            rowKey={(r) => `${r.id ?? ''}-${r.occurred_at ?? ''}-${r.description ?? ''}-${r.amount ?? ''}`}
            columns={columns}
            dataSource={report.rows}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Nenhum registro para os filtros selecionados.' }}
          />
        </>
      )}
    </Space>
  );
}
