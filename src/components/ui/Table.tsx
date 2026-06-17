import React from 'react';
import styles from './Table.module.css';

export function StatusBadge({ status }: { status: string }) {
  let className = styles.badgeDefault;
  if (['受注', '完了', '確度A'].includes(status)) className = styles.badgeSuccess;
  if (['検討中', '保留', '確度B'].includes(status)) className = styles.badgeWarning;
  if (['失注', 'キャンセル', '確度C'].includes(status)) className = styles.badgeDanger;

  return <span className={`${styles.badge} ${className}`}>{status || '-'}</span>;
}

export function Table({ columns, data }: { columns: string[], data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.tableContainer} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        データがありません
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, i) => <th key={i} className={styles.th}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} className={styles.tr}>
              {columns.map((col, j) => (
                <td key={j} className={styles.td}>
                  {col === 'ステータス' || col === '確度' ? (
                    <StatusBadge status={row[col]} />
                  ) : (
                    row[col] || '-'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
