import { Clock3, GitCommitHorizontal, TimerReset, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DeliveryCard } from '../types';

type TimingDashboardSectionProps = {
  cards: DeliveryCard[];
};

function metricSurface(tone: string) {
  return `rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_20px_55px_-35px_rgba(8,15,30,0.95)] ${tone}`;
}

function toDateValue(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffHours(start?: string, end?: string) {
  const startDate = toDateValue(start);
  const endDate = toDateValue(end);
  if (!startDate || !endDate) return null;
  return Math.max(0, Number(((endDate.getTime() - startDate.getTime()) / 36e5).toFixed(1)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function formatDate(value?: string) {
  if (!value) return 'Nao definido';
  const date = toDateValue(value);
  if (!date) return 'Nao definido';
  return date.toLocaleDateString('pt-BR');
}

export function TimingDashboardSection({ cards }: TimingDashboardSectionProps) {
  const devEstimatedValues = cards.map((card) => Number(card.devEstimatedHours || 0)).filter((value) => value > 0);
  const devActualValues = cards.map((card) => Number(card.devActualHours || 0)).filter((value) => value > 0);
  const qaActualValues = cards
    .flatMap((card) => card.scenarios.map((scenario) => Number(scenario.execution?.actualMinutes || 0) / 60))
    .filter((value) => value > 0);
  const leadTimes = cards
    .map((card) => diffHours(card.devStartedAt, card.devCompletedAt))
    .filter((value): value is number => value !== null);

  const overdueCards = cards.filter((card) => {
    const dueDate = toDateValue(card.dueDate);
    if (!dueDate) return false;
    const isDone = card.column === 'done';
    return !isDone && dueDate.getTime() < Date.now();
  });

  const cardsByOwner = cards.reduce<Record<string, number>>((acc, card) => {
    const key = card.owner || 'Sem responsavel';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[32px] border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_top_left,rgba(217,70,239,0.12),transparent_20%),linear-gradient(180deg,#0d1320_0%,#09101b_100%)] p-6 shadow-[0_30px_90px_-35px_rgba(8,15,30,0.95)]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-100">Tempo de entrega</Badge>
          <Badge className="rounded-full border-0 bg-white/10 text-slate-200">{cards.length} cards</Badge>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">Dashboard de tempos Orion</h2>
        <p className="max-w-4xl text-[15px] leading-7 text-slate-400">
          Visualize prazos, horas de desenvolvimento, execucao de QA e pontos de atencao sem sair do fluxo de entregas.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricSurface('')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Clock3 className="h-4 w-4 text-cyan-300" />
            Media de horas Dev
          </div>
          <div className="mt-3 text-3xl font-black text-white">{average(devActualValues) || average(devEstimatedValues)}h</div>
          <div className="mt-1 text-sm text-slate-400">Com base no realizado ou estimado</div>
        </div>
        <div className={metricSurface('')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <TimerReset className="h-4 w-4 text-emerald-300" />
            Media de horas QA
          </div>
          <div className="mt-3 text-3xl font-black text-white">{average(qaActualValues)}h</div>
          <div className="mt-1 text-sm text-slate-400">Tempo registrado nas execucoes</div>
        </div>
        <div className={metricSurface('')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <GitCommitHorizontal className="h-4 w-4 text-fuchsia-300" />
            Lead time Dev
          </div>
          <div className="mt-3 text-3xl font-black text-white">{average(leadTimes)}h</div>
          <div className="mt-1 text-sm text-slate-400">Entre inicio e conclusao de desenvolvimento</div>
        </div>
        <div className={metricSurface('')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <TriangleAlert className="h-4 w-4 text-amber-300" />
            Cards em atraso
          </div>
          <div className="mt-3 text-3xl font-black text-white">{overdueCards.length}</div>
          <div className="mt-1 text-sm text-slate-400">Due date vencido e entrega ainda aberta</div>
        </div>
      </div>

      <div className="mt-6 grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="min-h-0 rounded-[28px] border border-white/10 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Entregas com datas e tempos</div>
              <div className="mt-1 text-xs text-slate-400">Commit, due date, horas de dev e horas de QA registradas.</div>
            </div>
          </div>
          <div className="mt-4 max-h-[56vh] space-y-3 overflow-y-auto pr-2">
            {cards.map((card) => {
              const qaHours = Number(
                (
                  card.scenarios.reduce((sum, scenario) => sum + Number(scenario.execution?.actualMinutes || 0), 0) / 60
                ).toFixed(1),
              );
              const leadTime = diffHours(card.devStartedAt, card.devCompletedAt);

              return (
                <div key={`timing-${card.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">{card.id}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{card.title}</div>
                    </div>
                    <Badge className="rounded-full border-0 bg-white/10 text-slate-200">{card.owner || 'Sem responsavel'}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Commit date</div>
                      <div className="mt-1 text-sm font-semibold text-white">{formatDate(card.commitDate)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Due date</div>
                      <div className="mt-1 text-sm font-semibold text-white">{formatDate(card.dueDate)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Horas dev</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {Number(card.devActualHours || 0) || Number(card.devEstimatedHours || 0)}h
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Horas QA</div>
                      <div className="mt-1 text-sm font-semibold text-white">{qaHours}h</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Lead time dev</div>
                      <div className="mt-1 text-sm font-semibold text-white">{leadTime ?? 0}h</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Etapa atual</div>
                      <div className="mt-1 text-sm font-semibold text-white">{card.column}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 rounded-[28px] border border-white/10 bg-slate-950/40 p-5">
          <div className="text-sm font-semibold text-white">Carga por responsavel</div>
          <div className="mt-1 text-xs text-slate-400">Quantidade de cards por pessoa no fluxo.</div>
          <div className="mt-4 max-h-[56vh] space-y-3 overflow-y-auto pr-1">
            {Object.entries(cardsByOwner).map(([owner, count]) => (
              <div key={owner} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{owner}</div>
                  <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-100">{count} cards</Badge>
                </div>
              </div>
            ))}
            {Object.keys(cardsByOwner).length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                Nenhum dado de tempo disponivel ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
