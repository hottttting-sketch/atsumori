'use client';

import React from 'react';
import { Table } from '@/components/ui/Table';

const COLUMNS = ['受信日時', '送信元', '件名', '解析ステータス', '反映先', 'エラー内容'];

const MOCK_DATA = [
  {
    受信日時: '2026-06-17 14:30',
    送信元: 'client@example.com',
    件名: '【見積回答】博報堂案件について',
    解析ステータス: '完了',
    反映先: '博報堂見積',
    エラー内容: '-',
  },
  {
    受信日時: '2026-06-17 10:15',
    送信元: 'unknown@example.com',
    件名: 'Re: 共有事項',
    解析ステータス: 'エラー',
    反映先: '-',
    エラー内容: '対象データが見つかりません',
  }
];

export default function EmailLogsPage() {
  return (
    <div>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>メール受信ログ</h1>
        <p style={{ color: 'var(--text-secondary)' }}>受信したメールのAI解析結果とスプレッドシートへの反映状況を確認できます</p>
      </header>

      <div style={{ padding: '16px', backgroundColor: 'rgba(233, 196, 106, 0.1)', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)', color: 'var(--warning)' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
          ⚠️ 第4フェーズ前のモック表示
        </p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>
          現在はダミーデータを表示しています。第4フェーズでWebhook連携が実装されると、実際の解析ログが表示されるようになります。
        </p>
      </div>

      <Table columns={COLUMNS} data={MOCK_DATA} />
    </div>
  );
}
