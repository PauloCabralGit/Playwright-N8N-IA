import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DeliveryCard } from '../types';

type DeliveryBoardCardProps = {
  card: DeliveryCard;
  onOpen: (id: string) => void;
};

export function DeliveryBoardCard({ card, onOpen }: DeliveryBoardCardProps) {
  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.16 }}>
      <Card className="mx-auto w-full max-w-[320px] rounded-[26px] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] backdrop-blur-2xl shadow-[0_20px_60px_-30px_rgba(15,23,42,0.95)] hover:border-fuchsia-400/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-200/80">{card.epic}</div>
              <div className="mt-1 text-[15px] font-semibold leading-5 text-white">{card.title}</div>
              <div className="mt-1 text-xs text-slate-400">
                {card.id} • {card.module}
              </div>
            </div>
            <Badge className="rounded-full bg-white/10 text-white border-0">{card.priority}</Badge>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Objetivo</div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-200">{card.businessGoal}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full border-white/10 text-slate-200">
              {card.scenarios.length} cenários
            </Badge>
            <Badge variant="outline" className="rounded-full border-white/10 text-slate-200">
              {card.owner}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-400">{card.acceptanceCriteria.length} critérios</div>
            <Button onClick={() => onOpen(card.id)} className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100">
              Abrir
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
