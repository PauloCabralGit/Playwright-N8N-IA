import { cn } from '@/lib/utils';

type OrionLogoProps = {
  className?: string;
  compact?: boolean;
};

export function OrionLogo({ className, compact = false }: OrionLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(217,70,239,0.22))] shadow-[0_20px_50px_-24px_rgba(56,189,248,0.7)] ring-1 ring-white/10">
        <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
          <defs>
            <linearGradient id="orion-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="55%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="19" fill="none" stroke="url(#orion-ring)" strokeWidth="5" opacity="0.9" />
          <circle cx="32" cy="32" r="6.5" fill="#F8FAFC" opacity="0.95" />
          <circle cx="47" cy="18" r="4.5" fill="#67E8F9" opacity="0.95" />
          <path d="M18 43C23 35 30 30 41 27" fill="none" stroke="#E879F9" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </svg>
      </div>

      {!compact && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Orion</div>
          <div className="text-xl font-black tracking-tight text-white">Central de Entregas</div>
        </div>
      )}
    </div>
  );
}
