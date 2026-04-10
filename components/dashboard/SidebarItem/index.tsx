import { cn } from '@/lib/utils';
import type React from 'react';

type SidebarItemProps = {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
};

export function SidebarItem({ active, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all text-left',
        active
          ? 'bg-white text-slate-950 shadow-[0_12px_30px_-12px_rgba(255,255,255,0.9)]'
          : 'text-slate-300 hover:bg-white/10 hover:text-white'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
