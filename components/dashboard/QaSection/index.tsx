import { Bot, Clock3, Plus, Save, ShieldAlert, ShieldCheck, Target, Trash2, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { ColumnId, DeliveryCard, ExecutionStatus, Scenario, TeamMember } from '../types';

type QaSectionProps = {
  selectedCard: DeliveryCard;
  teamMembers: TeamMember[];
  moveCard: (cardId: string, newColumn: ColumnId) => void;
  generateAiScenario: () => void;
  onCardChange: (card: DeliveryCard) => void;
  onScenarioChange: (scenarioId: string, patch: Partial<Scenario>) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onAddScenario: () => void;
};

function renderStatusTone(status: ExecutionStatus) {
  switch (status) {
    case 'Passed':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
    case 'Failed':
      return 'border-rose-400/30 bg-rose-500/10 text-rose-100';
    default:
      return 'border-slate-700 bg-slate-950/70 text-slate-300';
  }
}

function sectionSurface(className = '') {
  return `rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_20px_55px_-35px_rgba(8,15,30,0.95)] ${className}`;
}

function fieldClassName(size: 'input' | 'textarea' = 'input') {
  return size === 'textarea'
    ? 'min-h-[120px] border-slate-800 bg-slate-950/80 text-white placeholder:text-slate-500'
    : 'border-slate-800 bg-slate-950/80 text-white placeholder:text-slate-500';
}

export function QaSection({
  selectedCard,
  teamMembers,
  moveCard,
  generateAiScenario,
  onCardChange,
  onScenarioChange,
  onDeleteScenario,
  onAddScenario,
}: QaSectionProps) {
  const totalScenarios = selectedCard.scenarios.length;
  const totalReady = selectedCard.scenarios.filter((scenario) => scenario.status === 'Ready' || scenario.status === 'Automated').length;
  const totalFailed = selectedCard.scenarios.filter((scenario) => scenario.execution?.status === 'Failed').length;

  return (
    <Card
      id="qa"
      className="flex max-h-[calc(88vh-7rem)] flex-col overflow-hidden rounded-[32px] border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_top_left,rgba(217,70,239,0.12),transparent_20%),linear-gradient(180deg,#0d1320_0%,#09101b_100%)] p-6 shadow-[0_30px_90px_-35px_rgba(8,15,30,0.95)]"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-cyan-500/10 text-cyan-100">{selectedCard.id}</Badge>
              <Badge className="rounded-full border-0 bg-white/10 text-slate-200">{selectedCard.module}</Badge>
              <Badge className="rounded-full border-0 bg-fuchsia-500/10 text-fuchsia-100">{selectedCard.epic}</Badge>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">Área de QA</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Reforce critérios, gere cenários, execute testes, registre evidências e mantenha a task pronta para entrega sem perder contexto.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-2xl border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
              onClick={generateAiScenario}
            >
              <Bot className="mr-2 h-4 w-4" />
              Geração IA
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => moveCard(selectedCard.id, 'testing')}
            >
              Mover para testing
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className={sectionSurface('p-4')}>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Cenários</div>
            <div className="mt-2 text-2xl font-black text-white">{totalScenarios}</div>
            <div className="mt-1 text-xs text-slate-400">Total vinculado à task</div>
          </div>
          <div className={sectionSurface('p-4')}>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Prontos</div>
            <div className="mt-2 text-2xl font-black text-emerald-200">{totalReady}</div>
            <div className="mt-1 text-xs text-slate-400">Ready ou Automated</div>
          </div>
          <div className={sectionSurface('p-4')}>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Reprovados</div>
            <div className="mt-2 text-2xl font-black text-rose-200">{totalFailed}</div>
            <div className="mt-1 text-xs text-slate-400">Execuções com falha</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="card" className="mt-6 flex min-h-0 flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-white/10 bg-slate-950/80 p-1">
          <TabsTrigger value="card" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-950">
            Card
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-950">
            Cenários
          </TabsTrigger>
          <TabsTrigger value="execution" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-950">
            Execução
          </TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={sectionSurface('p-5')}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <UserRound className="h-4 w-4 text-cyan-300" />
                    Responsável
                  </div>
                  <Select
                    value={selectedCard.ownerId || selectedCard.owner}
                    onValueChange={(value) => {
                      const member = teamMembers.find((item) => item.id === value);
                      onCardChange({
                        ...selectedCard,
                        ownerId: member?.id || value,
                        owner: member?.name || value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full border-slate-800 bg-slate-900 text-white">
                      <SelectValue placeholder="Escolha o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} • {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Clock3 className="h-4 w-4 text-cyan-300" />
                    Tempo estimado
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={selectedCard.estimatedExecutionMinutes || 0}
                    onChange={(event) =>
                      onCardChange({
                        ...selectedCard,
                        estimatedExecutionMinutes: Number(event.target.value || 0),
                      })
                    }
                    className={fieldClassName()}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Target className="h-4 w-4 text-fuchsia-300" />
                  Notas de QA
                </div>
                <Textarea
                  value={selectedCard.qaNotes || ''}
                  onChange={(event) => onCardChange({ ...selectedCard, qaNotes: event.target.value })}
                  className={`mt-3 min-h-[160px] ${fieldClassName('textarea')}`}
                />
              </div>
            </div>

            <div className={sectionSurface('p-5')}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Critérios de aceite</div>
                  <div className="mt-1 text-xs text-slate-400">Base da geração e da execução dos cenários</div>
                </div>
                <Badge className="rounded-full border-0 bg-white/10 text-slate-200">{selectedCard.acceptanceCriteria.length}</Badge>
              </div>
              <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {selectedCard.acceptanceCriteria.length > 0 ? (
                  selectedCard.acceptanceCriteria.map((criterion, index) => (
                    <div
                      key={`${selectedCard.id}-criterion-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-200"
                    >
                      {criterion}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                    Nenhum critério definido no card selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Cenários vinculados</div>
              <div className="mt-1 text-xs text-slate-400">Edite os cenários existentes ou remova os que não fizerem mais sentido.</div>
            </div>
            <Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={onAddScenario}>
              <Plus className="mr-2 h-4 w-4" />
              Cenário manual
            </Button>
          </div>

          <div className="space-y-4">
            {selectedCard.scenarios.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-700 bg-slate-950/40 px-5 py-6 text-sm text-slate-400">
                Nenhum cenário criado ainda. Use <span className="font-semibold text-slate-200">Cenário manual</span> ou <span className="font-semibold text-cyan-200">Geração IA</span>.
              </div>
            ) : (
              selectedCard.scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(9,16,27,0.95))] shadow-[0_20px_55px_-35px_rgba(8,15,30,0.95)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-0 bg-white/10 text-[10px] tracking-[0.18em] text-slate-200">{scenario.id}</Badge>
                        <Badge
                          className={
                            scenario.source === 'IA'
                              ? 'rounded-full border-0 bg-fuchsia-500/15 text-fuchsia-200'
                              : 'rounded-full border-0 bg-cyan-500/15 text-cyan-200'
                          }
                        >
                          {scenario.source}
                        </Badge>
                        <Badge className="rounded-full border-0 bg-emerald-500/10 text-emerald-200">{scenario.status}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-400">Cenário da task {selectedCard.id}</div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-2xl border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                      onClick={() => onDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>

                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    <Input
                      value={scenario.title}
                      onChange={(event) => onScenarioChange(scenario.id, { title: event.target.value })}
                      className={fieldClassName()}
                    />
                    <Select
                      value={scenario.source}
                      onValueChange={(value) => onScenarioChange(scenario.id, { source: value as Scenario['source'] })}
                    >
                      <SelectTrigger className={`w-full ${fieldClassName()}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="IA">IA</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={scenario.objective || ''}
                      onChange={(event) => onScenarioChange(scenario.id, { objective: event.target.value })}
                      placeholder="Objetivo do cenário"
                      className={`md:col-span-2 min-h-[90px] ${fieldClassName('textarea')}`}
                    />
                    <Textarea
                      value={scenario.steps || ''}
                      onChange={(event) => onScenarioChange(scenario.id, { steps: event.target.value })}
                      placeholder="Passos do teste"
                      className={fieldClassName('textarea')}
                    />
                    <Textarea
                      value={scenario.expectedResult || ''}
                      onChange={(event) => onScenarioChange(scenario.id, { expectedResult: event.target.value })}
                      placeholder="Resultado esperado"
                      className={fieldClassName('textarea')}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="execution" className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {selectedCard.scenarios.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-700 bg-slate-950/40 px-5 py-6 text-sm text-slate-400">
              Nenhum cenário disponível para execução ainda.
            </div>
          ) : (
            selectedCard.scenarios.map((scenario) => {
              const execution = scenario.execution || {
                estimatedMinutes: 10,
                actualMinutes: 0,
                status: 'Not Run' as const,
                notes: '',
                executedBy: '',
                evidences: [],
                bugSource: 'None' as const,
                bugTitle: '',
                bugDescription: '',
              };

              return (
                <div key={`${scenario.id}-execution`} className={`rounded-[26px] border p-5 shadow-[0_20px_55px_-35px_rgba(8,15,30,0.95)] ${renderStatusTone(execution.status)}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{scenario.title}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {execution.status === 'Failed' ? 'Reprovado' : execution.status === 'Passed' ? 'Aprovado' : 'Não executado'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                        onClick={() =>
                          onScenarioChange(scenario.id, {
                            execution: {
                              ...execution,
                              status: 'Passed',
                              bugSource: 'None',
                              bugTitle: '',
                              bugDescription: '',
                            },
                          })
                        }
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Passou
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                        onClick={() =>
                          onScenarioChange(scenario.id, {
                            execution: {
                              ...execution,
                              status: 'Failed',
                              bugSource: execution.bugSource === 'None' ? 'Manual' : execution.bugSource,
                            },
                          })
                        }
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Falhou
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Input
                      type="number"
                      min={0}
                      value={execution.estimatedMinutes}
                      onChange={(event) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            estimatedMinutes: Number(event.target.value || 0),
                          },
                        })
                      }
                      className={fieldClassName()}
                      placeholder="Tempo estimado"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={execution.actualMinutes}
                      onChange={(event) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            actualMinutes: Number(event.target.value || 0),
                          },
                        })
                      }
                      className={fieldClassName()}
                      placeholder="Tempo real"
                    />
                    <Select
                      value={execution.executedBy || selectedCard.ownerId || selectedCard.owner}
                      onValueChange={(value) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            executedBy: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className={`w-full ${fieldClassName()}`}>
                        <SelectValue placeholder="Quem executou" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={`${scenario.id}-${member.id}`} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={execution.bugSource}
                      onValueChange={(value) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            bugSource: value as 'IA' | 'Manual' | 'None',
                          },
                        })
                      }
                    >
                      <SelectTrigger className={`w-full ${fieldClassName()}`}>
                        <SelectValue placeholder="Abertura de bug" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">Sem bug</SelectItem>
                        <SelectItem value="Manual">Bug manual</SelectItem>
                        <SelectItem value="IA">Bug por IA</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={execution.notes}
                      onChange={(event) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            notes: event.target.value,
                          },
                        })
                      }
                      placeholder="Notas da execução"
                      className={`md:col-span-2 min-h-[110px] ${fieldClassName('textarea')}`}
                    />
                    <Textarea
                      value={execution.evidences.join('\n')}
                      onChange={(event) =>
                        onScenarioChange(scenario.id, {
                          execution: {
                            ...execution,
                            evidences: event.target.value
                              .split('\n')
                              .map((item) => item.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      placeholder="Cole links ou descrições das evidências, uma por linha"
                      className={`min-h-[110px] ${fieldClassName('textarea')}`}
                    />
                    <div className="space-y-3">
                      <Input
                        value={execution.bugTitle}
                        onChange={(event) =>
                          onScenarioChange(scenario.id, {
                            execution: {
                              ...execution,
                              bugTitle: event.target.value,
                            },
                          })
                        }
                        className={fieldClassName()}
                        placeholder="Título do bug"
                      />
                      <Textarea
                        value={execution.bugDescription}
                        onChange={(event) =>
                          onScenarioChange(scenario.id, {
                            execution: {
                              ...execution,
                              bugDescription: event.target.value,
                            },
                          })
                        }
                        placeholder="Descrição do bug"
                        className={`min-h-[110px] ${fieldClassName('textarea')}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-100" onClick={() => onCardChange(selectedCard)}>
          <Save className="mr-2 h-4 w-4" />
          Salvar card QA
        </Button>
      </div>
    </Card>
  );
}
