'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, History, Layers3, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Overview = {
  counts: {
    accounts: number;
    tenants: number;
    cards: number;
    history: number;
  };
  accounts: Array<Record<string, unknown>>;
  tenants: Array<Record<string, unknown>>;
  cards: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
};

function SectionCard({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[28px] border-white/10 bg-white/10 backdrop-blur-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white">
            {icon}
            <div className="text-lg font-black">{title}</div>
          </div>
          <Badge className="rounded-full bg-white/10 text-white border-0">{count}</Badge>
        </div>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch('/api/admin/overview', { cache: 'no-store' });
        if (!mounted) return;

        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          setError(payload?.error || 'Não foi possível carregar o admin.');
          return;
        }

        setOverview(payload);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o admin.');
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#060816_0%,#0b1020_45%,#0a0f1d_100%)] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-3xl font-black tracking-tight">Admin Postgres</div>
            <p className="mt-2 text-sm text-slate-400">Visão direta das contas, tenants, cards e histórico gravados no banco.</p>
          </div>
          <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {overview && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="rounded-[24px] border-white/10 bg-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-300"><Users className="h-4 w-4" /> Contas</div>
                  <div className="mt-2 text-3xl font-black">{overview.counts.accounts}</div>
                </CardContent>
              </Card>
              <Card className="rounded-[24px] border-white/10 bg-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-300"><Database className="h-4 w-4" /> Tenants</div>
                  <div className="mt-2 text-3xl font-black">{overview.counts.tenants}</div>
                </CardContent>
              </Card>
              <Card className="rounded-[24px] border-white/10 bg-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-300"><Layers3 className="h-4 w-4" /> Cards</div>
                  <div className="mt-2 text-3xl font-black">{overview.counts.cards}</div>
                </CardContent>
              </Card>
              <Card className="rounded-[24px] border-white/10 bg-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-slate-300"><History className="h-4 w-4" /> Histórico</div>
                  <div className="mt-2 text-3xl font-black">{overview.counts.history}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6">
              <SectionCard title="Contas" icon={<Users className="h-4 w-4" />} count={overview.counts.accounts}>
                <div className="space-y-3">
                  {overview.accounts.map((account) => (
                    <div key={String(account.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <div className="font-semibold text-white">{String(account.email || '')}</div>
                      <div className="mt-1 text-slate-400">
                        {String(account.company_name || '')} • {String(account.cnpj || '')} • Tenant {String(account.tenant_id || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Tenants" icon={<Database className="h-4 w-4" />} count={overview.counts.tenants}>
                <div className="space-y-3">
                  {overview.tenants.map((tenant) => (
                    <div key={String(tenant.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <div className="font-semibold text-white">{String(tenant.company_name || '')}</div>
                      <div className="mt-1 text-slate-400">
                        {String(tenant.slug || '')} • {String(tenant.webhook_url || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Cards" icon={<Layers3 className="h-4 w-4" />} count={overview.counts.cards}>
                <div className="space-y-3">
                  {overview.cards.map((card) => (
                    <div key={`${String(card.tenant_id || '')}-${String(card.card_id || '')}`} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <div className="font-semibold text-white">{String(card.card_id || '')}</div>
                      <div className="mt-1 text-slate-400">Tenant {String(card.tenant_id || '')}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Histórico de cards" icon={<History className="h-4 w-4" />} count={overview.counts.history}>
                <div className="space-y-3">
                  {overview.history.map((entry) => (
                    <div key={String(entry.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                      <div className="font-semibold text-white">
                        {String(entry.action || '')} • {String(entry.card_id || '')}
                      </div>
                      <div className="mt-1 text-slate-400">
                        Tenant {String(entry.tenant_id || '')} • {String(entry.created_at || '')}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
