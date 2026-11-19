import { AppShell } from '@/components/AppShell';
import { getSessionFromServerCookies } from '@/lib/auth';
import { getUserById } from '@/lib/users-repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    const session = await getSessionFromServerCookies();
    const initialUser = session ? getUserById(session.sub) : null;

    return <AppShell initialUser={initialUser} />;
}
