import { memo } from 'react';
import { formatCell, formatTimestamp } from '../../lib/formatters';
import { cn } from '../../lib/cn';
import { EditableCell } from './EditableCell';

export interface CellRendererProps {
  columnName: string;
  dataType?: string;
  value: unknown;
  isEditing: boolean;
  onCommit: (value: unknown) => void;
  onCancel: () => void;
}

export const CellRenderer = memo(function CellRenderer({
  columnName: _columnName,
  dataType,
  value,
  isEditing,
  onCommit,
  onCancel,
}: CellRendererProps) {
  const type = (dataType ?? '').toLowerCase();

  if (isEditing) {
    return <EditableCell value={value} type={type} onCommit={onCommit} onCancel={onCancel} />;
  }

  if (value === null || value === undefined) {
    return <span className="truncate italic text-fg-muted">NULL</span>;
  }

  if (type.includes('bool')) {
    return <span className="truncate font-mono text-sm text-purple-400">{String(value)}</span>;
  }

  if (
    type.includes('int') ||
    type.includes('serial') ||
    type.includes('double') ||
    type.includes('numeric') ||
    type.includes('decimal') ||
    type.includes('real') ||
    type.includes('float')
  ) {
    return <span className="truncate text-right font-mono text-sm text-amber-500 dark:text-amber-300">{String(value)}</span>;
  }

  if (type.includes('timestamp') || type.includes('date')) {
    return (
      <span className="truncate font-mono text-xs text-violet-500 dark:text-violet-300" title={String(value)}>
        {formatTimestamp(value)}
      </span>
    );
  }

  if (type.includes('json')) {
    const jsonText = formatCell(value);
    return (
      <span className="truncate font-mono text-xs text-fg" title={jsonText}>
        {jsonText.length > 120 ? `${jsonText.slice(0, 120)}…` : jsonText}
      </span>
    );
  }

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <span className={cn('truncate text-sm text-fg')} title={text}>
      {text.length > 120 ? `${text.slice(0, 120)}…` : text}
    </span>
  );
});
