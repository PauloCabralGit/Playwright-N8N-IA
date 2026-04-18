import { CalendarClock, GripVertical, Layers3, TimerReset, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DeliveryCard } from '../types';

type DeliveryBoardCardProps = {
  card: DeliveryCard;
  onOpen: (id: string) => void;
  onDragStart: (cardId: string) => void;
};

export function DeliveryBoardCard({ card, onOpen, onDragStart }: DeliveryBoardCardProps) {
  const ownerInitials = (card.owner || 'SR')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <Card
        draggable
        onDragStart={() => onDragStart(card.id)}
        onClick={() => onOpen(card.id)}
        className="group mx-auto w-full cursor-pointer overflow-hidden rounded-[24px] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,#121a2a_0%,#0c1320_100%)] shadow-[0_20px_50px_-35px_rgba(8,15,30,1)] transition-all hover:border-cyan-400/40 hover:shadow-[0_24px_60px_-30px_rgba(34,211,238,0.35)]"
      >
        <CardContent className="relative p-4">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400/0 via-cyan-300/70 to-fuchsia-400/0 opacity-80" />
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex flex-col items-center gap-3">
              <GripVertical className="h-4 w-4 shrink-0 text-cyan-200/60" />
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-black tracking-[0.18em] text-cyan-100">
                {ownerInitials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">{card.id}</div>
                <Badge className="rounded-full border-0 bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-slate-200">
                  {card.module || 'Geral'}
                </Badge>
              </div>
              <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-5 text-slate-50">{card.title}</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{card.owner || 'Sem responsavel'}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <Layers3 className="h-3.5 w-3.5 text-fuchsia-300/70" />
                <span className="truncate">{card.epic || 'Sem epico'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>Due</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">{card.dueDate || 'Sem data'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <TimerReset className="h-3.5 w-3.5" />
                    <span>Horas Dev</span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">{Number(card.devActualHours || card.devEstimatedHours || 0)}h</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
