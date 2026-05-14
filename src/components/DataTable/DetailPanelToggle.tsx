import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useI18n } from '../../hooks/useI18n';

export interface DetailPanelToggleProps {
  open: boolean;
  onToggle: () => void;
}

export function DetailPanelToggle({ open, onToggle }: DetailPanelToggleProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={onToggle}
      title={open ? t('detail.hide') : t('detail.show')}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        open
          ? 'bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 dark:text-blue-300'
          : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
      )}
    >
      {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
    </button>
  );
}
