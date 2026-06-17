'use client';

import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/Table';

const COLUMNS = [
  '記載日', '広告主', '契約名', '開始月', '開始日', '終了日', 
  '業推', '規模', 'ターゲット', '種類', '内容', '回答', 
  '回答〆切', '社内担当', '確度', 'ステータス', 'ＲＮＢ', 
  'ＩＴＶ', 'ＥＢＣ', 'ｅａｔ', 'メモ'
];

export default function EstimatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState('電通見積');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/estimates?agency=${agency}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [agency]);

  return (
    <div>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>見積管理</h1>
          <p style={{ color: 'var(--text-secondary)' }}>各代理店への見積回答履歴を管理します</p>
        </div>
        
        <select 
          value={agency} 
          onChange={(e) => setAgency(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="電通見積">電通</option>
          <option value="博報堂見積">博報堂</option>
          <option value="アザー見積">アザー</option>
        </select>
      </header>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>読み込み中...</div>
      ) : (
        <Table columns={COLUMNS} data={data} />
      )}
    </div>
  );
}
