import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type AutomationSectionProps = {
  totalAi: number;
  generateAiScenario: () => void;
};

export function AutomationSection({ totalAi, generateAiScenario }: AutomationSectionProps) {
  return (
    <Card id="automation" className="rounded-[30px] border-white/10 bg-white/8 p-6 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">IA e automação</h2>
          <p className="mt-1 text-sm text-slate-400">Gere sugestões de cenários IA para o card atual.</p>
        </div>
        <Button variant="outline" onClick={generateAiScenario}>
          Gerar IA
        </Button>
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200">
        <div className="font-semibold text-white">Cenários IA</div>
        <p className="mt-2 text-slate-300">{totalAi} cenários gerados por IA no total.</p>
      </div>
    </Card>
  );
}
