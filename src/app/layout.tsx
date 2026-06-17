import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: '熱盛 (Atsumori) - 業務効率化ツール',
  description: '見積回答、コンペ前のプレ情報、および売上予測を統合管理',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh', padding: '32px', backgroundColor: 'var(--bg-primary)' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
