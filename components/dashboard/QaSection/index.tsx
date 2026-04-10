import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ColumnId, DeliveryCard } from '../types';

type QaSectionProps = {
  selectedCard: DeliveryCard;
  moveCard: (cardId: string, newColumn: ColumnId) => void;
};

export function QaSection({ selectedCard, moveCard }: QaSectionProps) {
  return (
    <Card id="qa" className="rounded-[30px] border-white/10 bg-white/8 p-6 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Área de QA</h2>
          <p className="mt-1 text-sm text-slate-400">Movimente o card selecionado para a próxima etapa de QA.</p>
        </div>
        <Button variant="outline" onClick={() => moveCard(selectedCard.id, 'testing')}>
          Mover para testing
        </Button>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
        <div className="font-semibold text-white">Notas de QA</div>
        <p className="mt-2 text-slate-300">{selectedCard.qaNotes || 'Nenhuma nota adicionada ainda.'}</p>
      </div>
    </Card>
  );
}
