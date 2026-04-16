import { Bot, Clock3, Plus, Save, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';

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

export function QaSection({
  selectedCard,
  teamMembers,
  moveCard,
  generateAiScenario,
  onCardChange,
  onScenarioChange,
  onAddScenario,
}: QaSectionProps) {
  return (
    <Card id="qa" className="rounded-[30px] border-slate-800 bg-[linear-gradient(180deg,#0d1320_0%,#09101b_100%)] p-6 shadow-[0_30px_80px_-35px_rgba(8,15,30,0.95)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Area de QA</h2>
          <p className="mt-1 text-sm text-slate-400">
            Reforce criterios, gere cenarios com IA, execute testes e registre evidencias e bugs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
            onClick={generateAiScenario}
          >
            <Bot className="mr-2 h-4 w-4" />
            Geracao IA
          </Button>
          <Button variant="outline" onClick={() => moveCard(selectedCard.id, 'testing')}>
            Mover para testing
          </Button>
        </div>
      </div>

      <Tabs defaultValue="card" className="mt-6">
        <TabsList className="bg-slate-950/70">
          <TabsTrigger value="card">Card</TabsTrigger>
          <TabsTrigger value="scenarios">Cenarios</TabsTrigger>
          <TabsTrigger value="execution">Execucao</TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <UserRound className="h-4 w-4 text-cyan-300" />
                Responsavel
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
                  <SelectValue placeholder="Escolha o responsavel" />
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

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                Tempo estimado de execucao
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
                className="border-slate-800 bg-slate-900 text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-sm font-semibold text-slate-200">Notas de QA</div>
            <Textarea
              value={selectedCard.qaNotes || ''}
              onChange={(event) => onCardChange({ ...selectedCard, qaNotes: event.target.value })}
              className="mt-3 min-h-[140px] border-slate-800 bg-slate-900 text-white"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-sm font-semibold text-slate-200">Criterios de aceite</div>
            <div className="mt-3 space-y-2">
              {selectedCard.acceptanceCriteria.map((criterion, index) => (
                <div key={`${selectedCard.id}-criterion-${index}`} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-slate-200">
                  {criterion}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onAddScenario}>
              <Plus className="mr-2 h-4 w-4" />
              Cenario manual
            </Button>
          </div>
          <div className="space-y-4">
            {selectedCard.scenarios.map((scenario) => (
              <div key={scenario.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={scenario.title}
                    onChange={(event) => onScenarioChange(scenario.id, { title: event.target.value })}
                    className="border-slate-800 bg-slate-900 text-white"
                  />
                  <Select
                    value={scenario.source}
                    onValueChange={(value) => onScenarioChange(scenario.id, { source: value as Scenario['source'] })}
                  >
                    <SelectTrigger className="w-full border-slate-800 bg-slate-900 text-white">
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
                    placeholder="Objetivo do cenario"
                    className="min-h-[90px] border-slate-800 bg-slate-900 text-white md:col-span-2"
                  />
                  <Textarea
                    value={scenario.steps || ''}
                    onChange={(event) => onScenarioChange(scenario.id, { steps: event.target.value })}
                    placeholder="Passos do teste"
                    className="min-h-[120px] border-slate-800 bg-slate-900 text-white"
                  />
                  <Textarea
                    value={scenario.expectedResult || ''}
                    onChange={(event) => onScenarioChange(scenario.id, { expectedResult: event.target.value })}
                    placeholder="Resultado esperado"
                    className="min-h-[120px] border-slate-800 bg-slate-900 text-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="execution" className="mt-4 space-y-4">
          {selectedCard.scenarios.map((scenario) => {
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
              <div key={`${scenario.id}-execution`} className={`rounded-2xl border p-4 ${renderStatusTone(execution.status)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{scenario.title}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {execution.status === 'Failed' ? 'Reprovado' : execution.status === 'Passed' ? 'Aprovado' : 'Nao executado'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
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
                      className="border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
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
                    className="border-slate-700 bg-slate-950/70 text-white"
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
                    className="border-slate-700 bg-slate-950/70 text-white"
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
                    <SelectTrigger className="w-full border-slate-700 bg-slate-950/70 text-white">
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
                    <SelectTrigger className="w-full border-slate-700 bg-slate-950/70 text-white">
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
                    placeholder="Notas da execucao"
                    className="min-h-[100px] border-slate-700 bg-slate-950/70 text-white md:col-span-2"
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
                    placeholder="Cole links ou descricoes das evidencias, uma por linha"
                    className="min-h-[100px] border-slate-700 bg-slate-950/70 text-white"
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
                      className="border-slate-700 bg-slate-950/70 text-white"
                      placeholder="Titulo do bug"
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
                      placeholder="Descricao do bug"
                      className="min-h-[100px] border-slate-700 bg-slate-950/70 text-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => onCardChange(selectedCard)} className="bg-white text-slate-950 hover:bg-slate-100">
          <Save className="mr-2 h-4 w-4" />
          Salvar card QA
        </Button>
      </div>
    </Card>
  );
}
