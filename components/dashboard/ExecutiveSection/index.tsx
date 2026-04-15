import type { Dispatch, SetStateAction } from 'react';
import { Plus, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CreateFormState, PanelId, SyncStatus } from '../types';

type ExecutiveSectionProps = {
  syncMessage: string | null;
  syncStatus: SyncStatus;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  form: CreateFormState;
  setForm: Dispatch<SetStateAction<CreateFormState>>;
  handleCreate: () => void;
  openPanel: (id: PanelId) => void;
};

export function ExecutiveSection({
  syncMessage,
  syncStatus,
  createOpen,
  setCreateOpen,
  form,
  setForm,
  handleCreate,
  openPanel,
}: ExecutiveSectionProps) {
  return (
    <section id="executive" className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5" />
          SaaS visual PRO
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
          Um board bonito, forte e com cara de produto vendável.
        </h1>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
          O PO descreve o valor de negócio e os critérios de aceite. A IA transforma isso em cenários sugeridos. O QA refina, ajusta ou cria manualmente, enquanto o fluxo segue integrado com n8n e GitHub.
        </p>
        {syncMessage && (
          <div
            className={cn(
              'mt-4 rounded-2xl border px-4 py-3 text-sm',
              syncStatus === 'pending'
                ? 'border-slate-500 bg-slate-950/80 text-slate-100'
                : syncStatus === 'success'
                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-400 bg-amber-500/10 text-amber-200'
            )}
          >
            {syncMessage}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 text-white shadow-[0_18px_45px_-18px_rgba(217,70,239,0.95)] hover:from-fuchsia-500 hover:to-violet-500">
              <Plus className="mr-2 h-4 w-4" />
              Nova entrega
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-[#090d1a] text-white sm:max-w-3xl rounded-[32px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Criar entrega PO → QA</DialogTitle>
              <DialogDescription className="text-slate-400">
                Critérios de aceite aqui podem virar cenários sugeridos automaticamente pela IA e seguir para o fluxo do n8n.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={form.epic}
                onChange={(e) => setForm((prev) => ({ ...prev, epic: e.target.value }))}
                placeholder="Épico"
                className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
              <Input
                value={form.module}
                onChange={(e) => setForm((prev) => ({ ...prev, module: e.target.value }))}
                placeholder="Módulo"
                className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título da entrega"
                className="md:col-span-2 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
              <Textarea
                value={form.businessGoal}
                onChange={(e) => setForm((prev) => ({ ...prev, businessGoal: e.target.value }))}
                placeholder="Objetivo de negócio"
                className="md:col-span-2 min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
              <Textarea
                value={form.acceptanceCriteria}
                onChange={(e) => setForm((prev) => ({ ...prev, acceptanceCriteria: e.target.value }))}
                placeholder="Critérios de aceite (um por linha)"
                className="md:col-span-2 min-h-[150px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
              <Textarea
                value={form.qaNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, qaNotes: e.target.value }))}
                placeholder="Notas iniciais de QA"
                className="md:col-span-2 min-h-[110px] rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white-10" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500" onClick={handleCreate}>
                Criar entrega
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          className="h-11 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white-10"
          onClick={() => openPanel('settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </Button>
      </div>
    </section>
  );
}
