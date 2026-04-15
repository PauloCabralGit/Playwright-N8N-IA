import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { DeliveryCard, PanelId } from '../types';

type CriteriaSectionProps = {
  selectedCard: DeliveryCard;
  setSelectedId: (id: string) => void;
  setDetailOpen: (open: boolean) => void;
  setActiveSection: (id: PanelId) => void;
};

export function CriteriaSection({ selectedCard, setSelectedId, setDetailOpen, setActiveSection }: CriteriaSectionProps) {
  return (
    <Card id="criteria" className="rounded-[30px] border-white/10 bg-white/8 p-6 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Critérios de aceite</h2>
          <p className="mt-1 text-sm text-slate-400">Acompanhe os critérios do card selecionado.</p>
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
      <div className="mt-5 grid gap-3">
        {selectedCard.acceptanceCriteria.length > 0 ? (
          selectedCard.acceptanceCriteria.map((criterion, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
              {criterion}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-400">Nenhum critério definido no card selecionado.</div>
        )}
      </div>
    </Card>
  );
}
