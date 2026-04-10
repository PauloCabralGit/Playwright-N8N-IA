import { Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
};

export function KanbanSection({ columns, grouped, search, setSearch, setSelectedId, setDetailOpen }: KanbanSectionProps) {
  return (
    <section id="kanban" className="xl:col-span-12">
      <Card className="rounded-[30px] border-white/10 bg-white/8 backdrop-blur-2xl shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busque por entrega, módulo, cenário ou negócio"
                className="h-12 rounded-2xl border-white/10 bg-white/6 pl-11 text-white placeholder:text-slate-500"
              />
            </div>
            <Button variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white-10">
              <Filter className="mr-2 h-4 w-4" />
              Filtrar board
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 xl:grid-cols-5 md:grid-cols-2">
        {columns.map((column) => (
          <Card key={column.id} className="rounded-[28px] border-white/10 bg-white/8 backdrop-blur-2xl shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-bold text-white">{column.title}</CardTitle>
                <Badge className="rounded-full bg-white/10 text-white border-0">{grouped[column.id].length}</Badge>
              </div>
              <CardDescription className="text-slate-400">{column.hint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {grouped[column.id].map((card) => (
                <DeliveryBoardCard
                  key={card.id}
                  card={card}
                  onOpen={(id) => {
                    setSelectedId(id);
                    setDetailOpen(true);
                  }}
                />
              ))}

              {grouped[column.id].length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/10 px-4 py-6 text-center text-sm text-slate-400">
                  Nada nesta etapa.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
