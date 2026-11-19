'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { User } from '@/types/user';
import { LoginForm } from './LoginForm';

const Dashboard = dynamic(() => import('./Dashboard').then((m) => m.Dashboard), {
    loading: () => (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Loading IndiePulse dashboard...
        </div>
    ),
});

interface AppShellProps {
    initialUser: User | null;
}

export function AppShell({ initialUser }: AppShellProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(initialUser);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <LoginForm onLoginSuccess={setCurrentUser} />;
    }

    return (
        <Dashboard
            currentUser={currentUser}
            onCurrentUserUpdated={setCurrentUser}
            onLogout={handleLogout}
        />
    );
}
