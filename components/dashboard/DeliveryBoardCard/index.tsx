import { Clock3, GripVertical, ShieldCheck, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DeliveryCard } from '../types';

type DeliveryBoardCardProps = {
  card: DeliveryCard;
  onOpen: (id: string) => void;
  onOpenQa: (id: string) => void;
  onDragStart: (cardId: string) => void;
};

export function DeliveryBoardCard({ card, onOpen, onOpenQa, onDragStart }: DeliveryBoardCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <Card
        draggable
        onDragStart={() => onDragStart(card.id)}
        className="group mx-auto w-full rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,#101725_0%,#0d1320_100%)] shadow-[0_20px_50px_-35px_rgba(8,15,30,1)] transition-all hover:border-cyan-400/40 hover:shadow-[0_24px_60px_-30px_rgba(34,211,238,0.35)]"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                <GripVertical className="h-3.5 w-3.5 opacity-60" />
                {card.epic}
              </div>
              <div className="mt-2 text-[15px] font-semibold leading-5 text-slate-50">{card.title}</div>
              <div className="mt-1 text-xs text-slate-400">
                {card.id} • {card.module}
              </div>
            </div>
            <Badge className="rounded-full border-0 bg-cyan-500/15 text-cyan-100">{card.priority}</Badge>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Criterios</div>
            <div className="mt-2 space-y-2">
              {card.acceptanceCriteria.slice(0, 2).map((criterion, index) => (
                <div key={`${card.id}-criterion-${index}`} className="rounded-xl bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
                  {criterion}
                </div>
              ))}
              {card.acceptanceCriteria.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-500">
                  Sem criterios ainda
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-slate-700 text-slate-200">
              {card.scenarios.length} cenarios
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-700 text-slate-200">
              <UserRound className="mr-1 h-3.5 w-3.5" />
              {card.owner}
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-700 text-slate-200">
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {card.estimatedExecutionMinutes || 0} min
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-400">{card.acceptanceCriteria.length} criterios</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenQa(card.id)}
                className="rounded-2xl border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                QA
              </Button>
              <Button onClick={() => onOpen(card.id)} className="rounded-2xl bg-slate-100 text-slate-950 hover:bg-white">
                Abrir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
