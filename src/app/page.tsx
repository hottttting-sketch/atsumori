'use client';

import React, { useEffect, useState, useMemo } from 'react';
import styles from './page.module.css';

// データの型定義
interface ProcessedRow {
  id: string;
  sponsor: string;
  agencyLabel: 'D' | 'MP' | 'アザー';
  category: 'ラップ' | 'A' | 'B' | 'C' | 'D' | 'その他';
  amount: number;
  industry: string;
  department: string;
  notes: string;
  startMonth: string;
}

const CATEGORIES = ['ラップ', 'A', 'B', 'C', 'D'] as const;

// カンマ区切りの数値フォーマット
const formatNum = (num: number) => {
  if (isNaN(num)) return '0';
  return num.toLocaleString('ja-JP');
};

// 数値のパーサー
const parseNum = (val: any): number => {
  if (!val) return 0;
  const num = parseInt(String(val).replace(/[^\d-]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

// パーセンテージフォーマット
const formatPercent = (current: number, target: number) => {
  if (!target || target === 0) return '-';
  return `${((current / target) * 100).toFixed(1)}%`;
};

export default function Dashboard() {
  const [data, setData] = useState<ProcessedRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 選択月
  const [selectedMonth, setSelectedMonth] = useState<string>('4月');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // ユーザー入力用の状態 (localStorageで永続化)
  const [budget, setBudget] = useState<number>(0);
  const [prevYearMap, setPrevYearMap] = useState<Record<string, number>>({});

  // クライアントサイドでの初期読み込み（localStorage復元）
  useEffect(() => {
    const savedBudget = localStorage.getItem('dashboard_budget');
    if (savedBudget) setBudget(parseInt(savedBudget, 10));

    const savedPrevYear = localStorage.getItem('dashboard_prevYearMap');
    if (savedPrevYear) setPrevYearMap(JSON.parse(savedPrevYear));
  }, []);

  // 保存処理
  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseNum(e.target.value);
    setBudget(val);
    localStorage.setItem('dashboard_budget', String(val));
  };

  const handlePrevYearChange = (id: string, valStr: string) => {
    const val = parseNum(valStr);
    setPrevYearMap(prev => {
      const next = { ...prev, [id]: val };
      localStorage.setItem('dashboard_prevYearMap', JSON.stringify(next));
      return next;
    });
  };

  // データ取得
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/estimates?agency=電通見積').then(res => res.json()),
      fetch('/api/estimates?agency=博報堂見積').then(res => res.json()),
      fetch('/api/estimates?agency=アザー見積').then(res => res.json()),
      fetch('/api/presales').then(res => res.json())
    ]).then(results => {
      const allRows: any[] = [];
      results.forEach(res => {
        if (res.data) allRows.push(...res.data);
      });

      const processed: ProcessedRow[] = allRows.map((row: any, index: number) => {
        // 代理店の判定
        const agencyRaw = String(row['代理店'] || '');
        let agencyLabel: 'D' | 'MP' | 'アザー' = 'アザー';
        if (agencyRaw.includes('電通')) agencyLabel = 'D';
        else if (agencyRaw.includes('博報堂')) agencyLabel = 'MP';

        // 確度（カテゴリー）の判定
        const statusRaw = String(row['確度'] || '');
        let category: ProcessedRow['category'] = 'その他';
        if (statusRaw.includes('発注') || statusRaw.includes('済') || statusRaw === 'ラップ') category = 'ラップ';
        else if (statusRaw.includes('A')) category = 'A';
        else if (statusRaw.includes('B')) category = 'B';
        else if (statusRaw.includes('C')) category = 'C';
        else if (statusRaw.includes('D')) category = 'D';

        return {
          id: row.id || `row-${index}`,
          sponsor: row['広告主'] || '',
          agencyLabel,
          category,
          amount: parseNum(row['ｅａｔ'] || 0), // eat列を金額とする
          industry: row['業推'] || '',
          department: row['社内担当'] || '',
          notes: row['メモ'] || '',
          startMonth: row['開始月'] || '',
        };
      });

      // ユニークな開始月を抽出
      const months = Array.from(new Set(processed.map(r => r.startMonth).filter(Boolean)));
      setAvailableMonths(months.sort((a, b) => parseInt(a) - parseInt(b))); // 簡易的なソート
      if (months.length > 0 && !months.includes(selectedMonth)) {
        setSelectedMonth(months[0]);
      }

      setData(processed);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // 選択月のデータ
  const filteredData = useMemo(() => {
    return data.filter(r => r.startMonth === selectedMonth);
  }, [data, selectedMonth]);

  // サマリー集計
  const summary = useMemo(() => {
    const result: Record<string, { D: number; MP: number; アザー: number; total: number; prevD: number; prevMP: number; prevアザー: number; prevTotal: number }> = {};
    
    CATEGORIES.forEach(cat => {
      result[cat] = { D: 0, MP: 0, アザー: 0, total: 0, prevD: 0, prevMP: 0, prevアザー: 0, prevTotal: 0 };
    });
    result['合計'] = { D: 0, MP: 0, アザー: 0, total: 0, prevD: 0, prevMP: 0, prevアザー: 0, prevTotal: 0 };

    filteredData.forEach(row => {
      if (CATEGORIES.includes(row.category as any)) {
        const cat = row.category;
        const ag = row.agencyLabel;
        const prev = prevYearMap[row.id] || 0;

        // 加算
        result[cat][ag] += row.amount;
        result[cat].total += row.amount;
        result['合計'][ag] += row.amount;
        result['合計'].total += row.amount;

        // 前年の加算
        result[cat][`prev${ag}` as keyof typeof result[string]] += prev;
        result[cat].prevTotal += prev;
        result['合計'][`prev${ag}` as keyof typeof result[string]] += prev;
        result['合計'].prevTotal += prev;
      }
    });

    return result;
  }, [filteredData, prevYearMap]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ダッシュボード</h1>
          <p className={styles.subtitle}>月別のスポット見込みと実績を確認します</p>
        </div>
        <div className={styles.controls}>
          <select 
            className={styles.select}
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {availableMonths.length === 0 && <option value="">データなし</option>}
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>読み込み中...</div>
      ) : (
        <>
          {/* サマリー表 */}
          <div className={styles.card}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th rowSpan={2} className={styles.summaryTh}></th>
                    <th colSpan={3} className={styles.summaryTh}>総合計 (東京支社)</th>
                    <th colSpan={2} className={styles.summaryTh}>D (電通)</th>
                    <th colSpan={2} className={styles.summaryTh}>MP (博報堂)</th>
                    <th colSpan={2} className={styles.summaryTh}>アザー (その他)</th>
                  </tr>
                  <tr>
                    <th className={styles.summaryTh}>金額</th>
                    <th className={styles.summaryTh}>(前年比)</th>
                    <th className={styles.summaryTh}>(予算比)</th>
                    <th className={styles.summaryTh}>金額</th>
                    <th className={styles.summaryTh}>(前年比)</th>
                    <th className={styles.summaryTh}>金額</th>
                    <th className={styles.summaryTh}>(前年比)</th>
                    <th className={styles.summaryTh}>金額</th>
                    <th className={styles.summaryTh}>(前年比)</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(cat => (
                    <tr key={cat}>
                      <td className={styles.textCenter} style={{ fontWeight: 600 }}>{cat}</td>
                      <td>{formatNum(summary[cat].total)}</td>
                      <td>{formatPercent(summary[cat].total, summary[cat].prevTotal)}</td>
                      <td>{formatPercent(summary[cat].total, budget)}</td>
                      <td>{formatNum(summary[cat].D)}</td>
                      <td>{formatPercent(summary[cat].D, summary[cat].prevD)}</td>
                      <td>{formatNum(summary[cat].MP)}</td>
                      <td>{formatPercent(summary[cat].MP, summary[cat].prevMP)}</td>
                      <td>{formatNum(summary[cat].アザー)}</td>
                      <td>{formatPercent(summary[cat].アザー, summary[cat].prevアザー)}</td>
                    </tr>
                  ))}
                  {/* 合計行 */}
                  <tr className={styles.totalRow}>
                    <td className={styles.textCenter}>合計</td>
                    <td>{formatNum(summary['合計'].total)}</td>
                    <td>{formatPercent(summary['合計'].total, summary['合計'].prevTotal)}</td>
                    <td>{formatPercent(summary['合計'].total, budget)}</td>
                    <td>{formatNum(summary['合計'].D)}</td>
                    <td>{formatPercent(summary['合計'].D, summary['合計'].prevD)}</td>
                    <td>{formatNum(summary['合計'].MP)}</td>
                    <td>{formatPercent(summary['合計'].MP, summary['合計'].prevMP)}</td>
                    <td>{formatNum(summary['合計'].アザー)}</td>
                    <td>{formatPercent(summary['合計'].アザー, summary['合計'].prevアザー)}</td>
                  </tr>
                  {/* 予算行 */}
                  <tr className={styles.budgetRow}>
                    <td className={styles.textCenter}>予算</td>
                    <td>
                      <input 
                        type="text" 
                        className={styles.input} 
                        value={budget.toLocaleString('ja-JP')} 
                        onChange={handleBudgetChange}
                        placeholder="0"
                      />
                    </td>
                    <td colSpan={8} className={styles.textCenter} style={{ color: 'var(--text-muted)' }}>
                      ※予算は総合計に対する比率計算用です
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 詳細リスト表 */}
          <div className={styles.card}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.textLeft}>スポンサー</th>
                    <th>発注 (ラップ)</th>
                    <th>前年 (実績)</th>
                    <th>見込み (A〜D)</th>
                    <th className={styles.textCenter}>業種</th>
                    <th className={styles.textCenter}>代理店</th>
                    <th className={styles.textCenter}>局名</th>
                    <th className={styles.textLeft}>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(row => {
                    const isWrap = row.category === 'ラップ';
                    const prevValue = prevYearMap[row.id] || 0;
                    
                    return (
                      <tr key={row.id}>
                        <td className={styles.textLeft}>{row.sponsor || '-'}</td>
                        <td>{isWrap ? formatNum(row.amount) : '0'}</td>
                        <td>
                          <input 
                            type="text" 
                            className={styles.input} 
                            value={prevValue.toLocaleString('ja-JP')} 
                            onChange={(e) => handlePrevYearChange(row.id, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td>{!isWrap && ['A', 'B', 'C', 'D'].includes(row.category) ? formatNum(row.amount) : '0'}</td>
                        <td className={styles.textCenter}>{row.industry || '-'}</td>
                        <td className={styles.textCenter}>{row.agencyLabel}</td>
                        <td className={styles.textCenter}>{row.department || '-'}</td>
                        <td className={styles.textLeft}>{row.notes || ''}</td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={8} className={styles.textCenter} style={{ padding: '40px', color: 'var(--text-muted)' }}>
                        この月のデータはありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
