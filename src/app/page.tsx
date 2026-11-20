import { CatalogProvider } from '@/client/context/catalog-context';
import { ChatContainer } from '@/client/ui/containers/chat-container';
import { DashboardContainer } from '@/client/ui/containers/dashboard-container';

export default function Home() {
  return (
    <CatalogProvider>
      <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <section aria-label="Dashboard" className="min-w-0 flex-1 p-4 sm:p-6">
          <DashboardContainer />
        </section>
        <aside
          aria-label="Chat"
          className="border-t border-border p-4 sm:p-6 lg:sticky lg:top-0 lg:h-screen lg:w-[420px] lg:shrink-0 lg:border-t-0 lg:border-l"
        >
          <ChatContainer />
        </aside>
      </main>
    </CatalogProvider>
  );
}
