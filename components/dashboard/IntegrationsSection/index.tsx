import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { SectionSettings } from '../types';

type IntegrationsSectionProps = {
  syncSelectedCard: () => void;
  settings: SectionSettings;
};

export function IntegrationsSection({ syncSelectedCard, settings }: IntegrationsSectionProps) {
  return (
    <Card id="integrations" className="rounded-[30px] border-white/10 bg-white/8 p-6 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Integrações</h2>
          <p className="mt-1 text-sm text-slate-400">Sincronize manualmente o card atual com n8n.</p>
        </div>
        <Button variant="outline" onClick={syncSelectedCard}>
          Sincronizar
        </Button>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
        <div className="font-semibold text-white">Status</div>
        <p className="mt-2 text-slate-300">{settings.autoSync ? 'Auto-sync habilitado' : 'Auto-sync desabilitado'}</p>
      </div>
    </Card>
  );
}
