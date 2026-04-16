import { Clock3, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DeliveryCard, PanelId } from '../types';

type CriteriaSectionProps = {
  selectedCard: DeliveryCard;
  setSelectedId: (id: string) => void;
  setDetailOpen: (open: boolean) => void;
  setActiveSection: (id: PanelId) => void;
};

export function CriteriaSection({
  selectedCard,
  setSelectedId,
  setDetailOpen,
  setActiveSection,
}: CriteriaSectionProps) {
  return (
    <Card id="criteria" className="rounded-[30px] border-slate-800 bg-[linear-gradient(180deg,#0d1320_0%,#09101b_100%)] p-6 shadow-[0_30px_80px_-35px_rgba(8,15,30,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Criterios de aceite</h2>
          <p className="mt-1 text-sm text-slate-400">Organize o que precisa ser validado antes da geracao e execucao de cenarios.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedId(selectedCard.id);
            setDetailOpen(true);
            setActiveSection('criteria');
          }}
        >
          Ver detalhes
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-cyan-300" />
            Responsavel
          </div>
          <div className="mt-2 text-sm text-slate-300">{selectedCard.owner}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4 text-cyan-300" />
            Tempo estimado
          </div>
          <div className="mt-2 text-sm text-slate-300">{selectedCard.estimatedExecutionMinutes || 0} min</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {selectedCard.acceptanceCriteria.length > 0 ? (
          selectedCard.acceptanceCriteria.map((criterion, index) => (
            <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              {criterion}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-500">
            Nenhum criterio definido no card selecionado.
          </div>
        )}
      </div>
    </Card>
  );
}
