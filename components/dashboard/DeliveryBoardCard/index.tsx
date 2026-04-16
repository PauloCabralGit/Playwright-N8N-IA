import { GripVertical, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import type { DeliveryCard } from '../types';

type DeliveryBoardCardProps = {
  card: DeliveryCard;
  onOpen: (id: string) => void;
  onDragStart: (cardId: string) => void;
};

export function DeliveryBoardCard({ card, onOpen, onDragStart }: DeliveryBoardCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <Card
        draggable
        onDragStart={() => onDragStart(card.id)}
        onClick={() => onOpen(card.id)}
        className="group mx-auto w-full cursor-pointer rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,#101725_0%,#0d1320_100%)] shadow-[0_20px_50px_-35px_rgba(8,15,30,1)] transition-all hover:border-cyan-400/40 hover:shadow-[0_24px_60px_-30px_rgba(34,211,238,0.35)]"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200/60" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">{card.id}</div>
              <div className="mt-2 truncate text-[15px] font-semibold leading-5 text-slate-50">{card.title}</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{card.owner || 'Sem responsável'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
