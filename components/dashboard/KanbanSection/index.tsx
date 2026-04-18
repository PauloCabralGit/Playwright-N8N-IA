import { Filter, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DeliveryBoardCard } from '../DeliveryBoardCard';
import type { ColumnId, DeliveryCard } from '../types';

type KanbanSectionProps = {
  columns: { id: ColumnId; title: string; hint: string }[];
  grouped: Record<ColumnId, DeliveryCard[]>;
  search: string;
  setSearch: (value: string) => void;
  setSelectedId: (id: string) => void;
  setDetailOpen: (open: boolean) => void;
  moveCard: (cardId: string, newColumn: ColumnId) => void;
};

const columnGlow: Record<ColumnId, string> = {
  discovery: 'from-sky-500/30 to-cyan-500/10',
  refinement: 'from-amber-500/30 to-orange-500/10',
  development: 'from-violet-500/30 to-indigo-500/10',
  qa: 'from-fuchsia-500/30 to-violet-500/10',
  testing: 'from-emerald-500/30 to-lime-500/10',
  done: 'from-cyan-400/30 to-emerald-400/10',
};

export function KanbanSection({
  columns,
  grouped,
  search,
  setSearch,
  setSelectedId,
  setDetailOpen,
  moveCard,
}: KanbanSectionProps) {
  const handleDragStart = (cardId: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('qa_drag_card_id', cardId);
  };

  const handleDrop = (columnId: ColumnId) => {
    if (typeof window === 'undefined') return;
    const cardId = window.sessionStorage.getItem('qa_drag_card_id');
    if (!cardId) return;
    window.sessionStorage.removeItem('qa_drag_card_id');
    void moveCard(cardId, columnId);
  };

  return (
    <section id="kanban" className="xl:col-span-12">
      <Card className="rounded-[30px] border-slate-800 bg-[linear-gradient(180deg,#0d1320_0%,#09101b_100%)] shadow-[0_30px_80px_-35px_rgba(8,15,30,0.95)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busque por entrega, modulo, criterio, responsavel ou cenario"
                className="h-12 rounded-2xl border-slate-800 bg-slate-950/80 pl-11 text-white placeholder:text-slate-500"
              />
            </div>
            <Button variant="outline" className="h-12 rounded-2xl border-slate-800 bg-slate-950/70 text-slate-100 hover:bg-slate-900">
              <Filter className="mr-2 h-4 w-4" />
              Board QA
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-6 xl:grid-cols-3">
        {columns.map((column) => (
          <Card
            key={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(column.id)}
            className="rounded-[28px] border-slate-800 bg-[linear-gradient(180deg,#0e1522_0%,#0a1019_100%)] shadow-[0_30px_80px_-35px_rgba(8,15,30,0.95)]"
          >
            <CardHeader className="pb-3">
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${columnGlow[column.id]}`} />
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-bold text-white">{column.title}</CardTitle>
                <Badge className="rounded-full border-0 bg-slate-800 text-slate-100">{grouped[column.id].length}</Badge>
              </div>
              <CardDescription className="text-slate-400">{column.hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[column.id].map((card) => (
                <DeliveryBoardCard
                  key={card.id}
                  card={card}
                  onDragStart={handleDragStart}
                  onOpen={(id) => {
                    setSelectedId(id);
                    setDetailOpen(true);
                  }}
                />
              ))}

              {grouped[column.id].length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-500">
                  Arraste um card para esta etapa.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
