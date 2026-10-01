import { useState, useEffect } from 'react';
import { Table, Pagination, Spin, Button } from 'antd';
import styles from '../../../styles/Admin.module.css';

const MOBILE_QUERY = '(max-width: 768px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

const resolveKey = (rowKey, row, i) => {
  if (typeof rowKey === 'function') return rowKey(row);
  return row[rowKey ?? 'key'] ?? i;
};

const cellValue = (col, row, index) => {
  const value = Array.isArray(col.dataIndex)
    ? col.dataIndex.reduce((acc, k) => acc?.[k], row)
    : row[col.dataIndex];
  return col.render ? col.render(value, row, index) : value;
};

/**
 * Mesma API do <Table> do antd. No desktop é a própria tabela; no mobile cada
 * linha vira um cartão "rótulo: valor" com todas as colunas visíveis, sem
 * precisar rolar para o lado. Colunas sem título (ex.: botão de remover) e a
 * coluna de ações vão para o rodapé do cartão.
 */
export default function ResponsiveTable(props) {
  const {
    dataSource = [], columns = [], rowKey, loading, pagination, locale, expandable,
  } = props;
  const mobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  if (!mobile) return <Table {...props} />;

  const pageSize = pagination?.pageSize ?? dataSource.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(dataSource.length / pageSize)));
  const start = pagination ? (currentPage - 1) * pageSize : 0;
  const rows = pagination ? dataSource.slice(start, start + pageSize) : dataSource;
  const isAction = (c) => !c.title || c.key === 'actions';
  const fields = columns.filter((c) => !isAction(c));
  const actions = columns.filter(isAction);

  if (loading) return <div className={styles.mobileEmpty}><Spin /></div>;
  if (dataSource.length === 0) {
    return <div className={styles.mobileEmpty}>{locale?.emptyText ?? 'Nenhum registro.'}</div>;
  }

  return (
    <div className={styles.mobileList}>
      {rows.map((row, i) => {
        const key = resolveKey(rowKey, row, start + i);
        const index = start + i;
        return (
          <div className={styles.mobileCard} key={key}>
            {fields.map((col) => (
              <div className={styles.mobileField} key={col.key ?? String(col.dataIndex)}>
                <span className={styles.mobileLabel}>{col.title}</span>
                <span className={styles.mobileValue}>{cellValue(col, row, index)}</span>
              </div>
            ))}
            {actions.map((col) => (
              <div className={styles.mobileActions} key={col.key ?? String(col.dataIndex)}>
                {cellValue(col, row, index)}
              </div>
            ))}
            {expandable?.expandedRowRender && (
              <>
                <Button
                  size="small"
                  block
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  {expanded === key ? 'Ocultar inscritos' : 'Ver inscritos'}
                </Button>
                {expanded === key && (
                  <div className={styles.mobileExpanded}>{expandable.expandedRowRender(row)}</div>
                )}
              </>
            )}
          </div>
        );
      })}
      {pagination && dataSource.length > pageSize && (
        <Pagination
          simple
          align="center"
          current={currentPage}
          pageSize={pageSize}
          total={dataSource.length}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </div>
  );
}
