'use client';

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { Table } from '@/components/ui/Table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SUMMARY_COLUMNS = [
  '記載日', '広告主', '契約名', '規模', 'ステータス', '確度'
];

export default function Home() {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [presales, setPresales] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // 簡易的に電通見積とプレ情報を取得して表示する
    Promise.all([
      fetch('/api/estimates?agency=電通見積').then(res => res.json()),
      fetch('/api/presales').then(res => res.json())
    ]).then(([estRes, preRes]) => {
      const estData = estRes.data || [];
      const preData = preRes.data || [];
      
      setEstimates(estData.slice(0, 5)); // 最新5件
      setPresales(preData.slice(0, 5)); // 最新5件

      // モックのチャートデータ（後で実際の集計ロジックにする）
      setChartData([
        { name: '4月', 売上: 4000, 予測: 2400 },
        { name: '5月', 売上: 3000, 予測: 1398 },
        { name: '6月', 売上: 2000, 予測: 9800 },
        { name: '7月', 売上: 2780, 予測: 3908 },
        { name: '8月', 売上: 1890, 予測: 4800 },
        { name: '9月', 売上: 2390, 予測: 3800 },
      ]);
    }).catch(err => {
      console.error(err);
    });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ダッシュボード</h1>
          <p className={styles.subtitle}>売上予測と最新の状況を確認しましょう</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>売上予測 (モックデータ)</h2>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="売上" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="予測" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>直近の見積回答 (電通)</h2>
          <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
            <Table columns={SUMMARY_COLUMNS} data={estimates} />
          </div>
        </div>
        <div className="card" style={{ gridColumn: 'span 3' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>最新のプレ情報</h2>
          <Table columns={SUMMARY_COLUMNS} data={presales} />
        </div>
      </div>
    </div>
  );
}
