'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Shield, Trash2, User as UserIcon, Users, X } from 'lucide-react';
import type { User, UserRole } from '@/types/user';

interface UserManagementModalProps {
    isOpen: boolean;
    currentUser: User;
    onClose: () => void;
    onCurrentUserUpdated?: (user: User) => void;
}

export function UserManagementModal({
    isOpen,
    currentUser,
    onClose,
    onCurrentUserUpdated,
}: UserManagementModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state (null = list view, 'create' = new user, User = edit user)
    const [formMode, setFormMode] = useState<'create' | User | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('member');
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const isAdmin = currentUser.role === 'admin';

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/users', { cache: 'no-store' });
            const data = (await res.json().catch(() => ({}))) as {
                users?: User[];
                error?: string;
            };
            if (!res.ok) {
                throw new Error(data.error || 'Failed to load users');
            }
            setUsers(data.users ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setFormMode(null);
        void fetchUsers();
    }, [isOpen, fetchUsers]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const openCreateForm = () => {
        setError(null);
        setName('');
        setEmail('');
        setRole('member');
        setPassword('');
        setFormMode('create');
    };

    const openEditForm = (user: User) => {
        setError(null);
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setPassword('');
        setFormMode(user);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        try {
            const isCreate = formMode === 'create';
            const url = isCreate ? '/api/users' : `/api/users/${(formMode as User).id}`;
            const method = isCreate ? 'POST' : 'PATCH';

            const payload: Record<string, string> = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role,
            };
            if (isCreate || password.trim().length > 0) {
                payload.password = password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = (await res.json().catch(() => ({}))) as {
                user?: User;
                error?: string;
            };

            if (!res.ok || !data.user) {
                throw new Error(data.error || `Failed to ${isCreate ? 'create' : 'update'} user`);
            }

            if (data.user.id === currentUser.id && onCurrentUserUpdated) {
                onCurrentUserUpdated(data.user);
            }

            setFormMode(null);
            await fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (userId: number) => {
        setError(null);
        setDeletingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete user');
            }
            await fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-management-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <h2
                                id="user-management-title"
                                className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
                            >
                                User Management
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {users.length} {users.length === 1 ? 'user' : 'users'} registered
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAdmin && formMode === null && (
                            <button
                                type="button"
                                onClick={openCreateForm}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add User
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            aria-label="Close user management modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                            {error}
                        </div>
                    )}

                    {!isAdmin && (
                        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                            Signed in as{' '}
                            <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                {currentUser.name}
                            </span>{' '}
                            (member). Admin role is required to create, edit, or delete users.
                        </div>
                    )}

                    {formMode !== null ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                                    {formMode === 'create'
                                        ? 'Create New User'
                                        : `Edit ${formMode.name}`}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setFormMode(null)}
                                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                                >
                                    Back to list
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jane Smith"
                                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-950"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="jane.smith@indiegames.ai"
                                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-950"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Role
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:bg-zinc-950"
                                    >
                                        <option value="member">member</option>
                                        <option value="admin">admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Password{' '}
                                        {formMode !== 'create' && (
                                            <span className="text-zinc-500">
                                                (leave blank to keep)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="password"
                                        required={formMode === 'create'}
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={
                                            formMode === 'create' ? 'Min 6 characters' : '••••••••'
                                        }
                                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-950"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormMode(null)}
                                    className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
                                >
                                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {formMode === 'create' ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-12 text-zinc-400">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="text-xs">Loading users...</span>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-12 text-center text-xs text-zinc-500">
                            No users found.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-zinc-50 dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-950/50">
                            {users.map((user) => {
                                const isSelf = user.id === currentUser.id;
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between gap-4 px-4 py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {user.name}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                        user.role === 'admin'
                                                            ? 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {user.role === 'admin' ? (
                                                        <Shield className="h-2.5 w-2.5" />
                                                    ) : (
                                                        <UserIcon className="h-2.5 w-2.5" />
                                                    )}
                                                    {user.role}
                                                </span>
                                                {isSelf && (
                                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                {user.email}
                                            </p>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditForm(user)}
                                                    className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                                    title={`Edit ${user.name}`}
                                                    aria-label={`Edit ${user.name}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSelf || deletingId === user.id}
                                                    onClick={() => void handleDelete(user.id)}
                                                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-35"
                                                    title={
                                                        isSelf
                                                            ? 'Cannot delete your own account'
                                                            : `Delete ${user.name}`
                                                    }
                                                    aria-label={`Delete ${user.name}`}
                                                >
                                                    {deletingId === user.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
