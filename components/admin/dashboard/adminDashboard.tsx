'use client';

import React, { useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Users, FileText, Settings, LogOut, Menu as MenuIcon, ChevronLeft } from 'lucide-react';
import styles from './adminDashboard.module.css';

// Custom UI Components
const Layout: React.FC<{ children: ReactNode, vertical?: boolean }> = ({ children, vertical }) => (
    <div className={`${styles.layout} ${vertical ? styles.vertical : ''}`}>{children}</div>
);

const Sider = ({ children, collapsed }: { children: ReactNode; collapsed: boolean }) => (
    <div className={`${styles.sider} ${collapsed ? styles.collapsed : ''}`}>{children}</div>
);

const Header = ({ children }: { children: ReactNode }) => (
    <header className={styles.header}>{children}</header>
);

const Content = ({ children }: { children: ReactNode }) => (
    <main className={styles.content}>{children}</main>
);

type MenuItem = {
    key: string;
    icon: ReactNode;
    label: string;
    path: string;
};

const Menu: React.FC<{ items: MenuItem[]; selectedKey: string }> = ({ items, selectedKey }) => (
    <nav className={styles.menu}>
        {items.map((item) => (
            <Link className={`${styles.menuItem} ${item.path === selectedKey ? styles.selected : ''}`} key={item.key} href={item.path} passHref>
                {item.icon}
                <span className={styles.label}>{item.label}</span>
            </Link>
        ))}
    </nav>
);

const Button: React.FC<{
    children: ReactNode;
    onClick?: () => void;
    icon?: ReactNode;
    type?: 'primary' | 'text';
}> = ({ children, onClick, icon, type = 'text' }) => (
    <button
        className={`${styles.button} ${type === 'primary' ? styles.primaryButton : styles.textButton}`}
        onClick={onClick}
    >
        {icon && <span className={styles.buttonIcon}>{icon}</span>}
        {children}
    </button>
);

// Menu items configuration
const menuItems: MenuItem[] = [
    { key: '1', icon: <Home size={20} />, label: 'Home', path: '/admin' },
    { key: '2', icon: <Home size={20} />, label: 'ErrorTypes', path: '/admin/error-types' },
    { key: '3', icon: <Users size={20} />, label: 'Users', path: '/admin/users' },
    { key: '4', icon: <FileText size={20} />, label: 'Logs', path: '/admin/logs' },
    { key: '5', icon: <Settings size={20} />, label: 'Settings', path: '/admin/settings' },
];

// Main AdminDashboard component
const AdminDashboard: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <Layout>
            <Sider collapsed={collapsed}>
                <div className={styles.logo}>
                    <LogOut size={24} />
                    {!collapsed && <span className={styles.logoText}>Admin Panel</span>}
                </div>
                <Menu items={menuItems} selectedKey={pathname} />
            </Sider>
            <Layout vertical>
                <Header>
                    <Button onClick={toggleSidebar} icon={collapsed ? <MenuIcon size={20} /> : <ChevronLeft size={20} />}>
                        {collapsed ? 'Expand' : 'Collapse'}
                    </Button>
                    <div className={styles.headerRight}>
                    </div>
                </Header>
                <Content>
                    <div className={styles.pageContent}>{children}</div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminDashboard;