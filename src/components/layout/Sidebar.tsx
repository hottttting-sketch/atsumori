'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Users, Mail, Flame } from 'lucide-react';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: Home },
  { href: '/estimates', label: '見積管理', icon: FileText },
  { href: '/presales', label: 'プレ情報管理', icon: Users },
  { href: '/email-logs', label: 'メール受信ログ', icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Flame className={styles.logoIcon} size={28} />
        <span>熱盛</span>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(styles.navItem, isActive && styles.active)}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
