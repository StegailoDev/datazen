import { DatabaseBackup, Download, Plus, RefreshCcw } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ActionPanelProps {
  onNewConnection: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onDataSync: () => void;
}

export function ActionPanel({ onNewConnection, onBackup, onRestore, onDataSync }: ActionPanelProps) {
  const items = [
    { icon: DatabaseBackup, label: '备份数据库…', action: onBackup },
    { icon: Download, label: '恢复数据库…', action: onRestore },
    { icon: RefreshCcw, label: '数据同步…', action: onDataSync },
    { icon: Plus, label: '新建连接…', action: onNewConnection },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 px-3 pt-8 pb-4">
        <img
          src="/logo.png"
          alt="DataZen"
          className="h-24 w-24 drop-shadow-lg"
          draggable={false}
        />
        <span className="text-base font-bold tracking-wider text-fg">DataZen</span>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 p-3">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-fg-secondary transition-colors',
              'hover:bg-surface-raised hover:text-fg',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
