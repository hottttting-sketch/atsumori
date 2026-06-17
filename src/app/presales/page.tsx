'use client';

import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/Table';

const COLUMNS = [
  '記載日', '広告主', '契約名', '開始月', '開始日', '終了日', 
  '業推', '規模', 'ターゲット', '種類', '内容', '回答', 
  '回答〆切', '社内担当', '確度', 'ステータス', 'ＲＮＢ', 
  'ＩＴＶ', 'ＥＢＣ', 'ｅａｔ', 'メモ'
];

export default function PresalesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/presales')
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>プレ情報管理</h1>
        <p style={{ color: 'var(--text-secondary)' }}>案件化する前の引き合い段階の情報を管理します</p>
      </header>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>読み込み中...</div>
      ) : (
        <Table columns={COLUMNS} data={data} />
      )}
    </div>
  );
}
