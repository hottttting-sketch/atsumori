'use client';

import React, { useEffect, useState } from 'react';
import { Table } from '@/components/ui/Table';

const COLUMNS = ['受信日時', '件名', '解析ステータス', '反映先', 'エラー内容'];

export default function EmailLogsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/email-logs');
        const json = await response.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to fetch logs');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>メール受信ログ</h1>
        <p style={{ color: 'var(--text-secondary)' }}>受信したメールのAI解析結果とスプレッドシートへの反映状況を確認できます</p>
      </header>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : error ? (
        <div style={{ padding: '16px', backgroundColor: 'rgba(233, 106, 106, 0.1)', borderRadius: '8px', color: 'red' }}>
          エラーが発生しました: {error}
        </div>
      ) : (
        <Table columns={COLUMNS} data={data} />
      )}
    </div>
  );
}
