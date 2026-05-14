import { useCallback, useEffect, useRef, useState } from 'react';
import type { ColumnDef } from './TableHeader';
import { toEditString } from './EditableCell';
import { formatCell } from '../../lib/formatters';
import { useI18n } from '../../hooks/useI18n';
import { cn } from '../../lib/cn';

export interface DetailPanelProps {
  open: boolean;
  columns: ColumnDef[];
  row: Record<string, unknown> | null;
  rowIndex: number | null;
  editable?: boolean;
  onFieldEdit?: (row: number, col: string, value: unknown) => void;
}

export function DetailPanel({
  open,
  columns,
  row,
  rowIndex,
  editable,
  onFieldEdit,
}: DetailPanelProps) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-edge bg-surface-alt">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-edge px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {t('detail.title')}
        </span>
      </div>

      {row === null ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-fg-muted">
          {t('detail.noSelection')}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {columns.map((col) => (
            <FieldRow
              key={col.id}
              column={col}
              value={row[col.name]}
              editable={editable}
              onCommit={
                editable && onFieldEdit && rowIndex !== null
                  ? (v) => onFieldEdit(rowIndex, col.name, v)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </aside>
  );
}

interface FieldRowProps {
  column: ColumnDef;
  value: unknown;
  editable?: boolean;
  onCommit?: (value: unknown) => void;
}

function FieldRow({ column, value, editable, onCommit }: FieldRowProps) {
  const isNull = value === null || value === undefined;
  const type = (column.type ?? '').toLowerCase();
  const isJson = type.includes('json');
  const isLongText = type.includes('text') || isJson;

  return (
    <div className="border-b border-edge/50 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-fg-secondary">{column.name}</span>
        {column.type && (
          <span className="shrink-0 font-mono text-[10px] text-fg-muted">{column.type}</span>
        )}
      </div>
      {editable && onCommit ? (
        <InlineFieldEditor value={value} type={type} isLongText={isLongText} onCommit={onCommit} />
      ) : (
        <div
          className={cn(
            'break-all font-mono text-xs',
            isNull ? 'italic text-fg-muted' : 'text-fg',
          )}
        >
          {isNull ? 'NULL' : formatCell(value)}
        </div>
      )}
    </div>
  );
}

interface InlineFieldEditorProps {
  value: unknown;
  type: string;
  isLongText: boolean;
  onCommit: (value: unknown) => void;
}

function InlineFieldEditor({ value, type, isLongText, onCommit }: InlineFieldEditorProps) {
  const isNull = value === null || value === undefined;
  const display = toEditString(value);
  const [local, setLocal] = useState(display);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setLocal(toEditString(value));
  }, [value, editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = local;
    if (trimmed === toEditString(value)) return;
    if (trimmed === '' && isNull) return;
    if (trimmed === '') {
      onCommit(null);
      return;
    }
    if (type.includes('int') || type.includes('serial') || type.includes('bigint')) {
      onCommit(Number(trimmed));
      return;
    }
    if (type.includes('bool')) {
      onCommit(trimmed === 'true');
      return;
    }
    if (type.includes('float') || type.includes('double') || type.includes('numeric') || type.includes('decimal') || type.includes('real')) {
      onCommit(Number(trimmed));
      return;
    }
    if (type.includes('json')) {
      try { onCommit(JSON.parse(trimmed)); } catch { onCommit(trimmed); }
      return;
    }
    onCommit(trimmed);
  }, [local, value, isNull, type, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocal(toEditString(value));
        setEditing(false);
        return;
      }
      if (e.key === 'Enter' && !isLongText) {
        e.preventDefault();
        commit();
      }
    },
    [value, isLongText, commit],
  );

  const sharedClass = cn(
    'w-full rounded-sm border px-2 py-1 font-mono text-xs transition-colors',
    editing
      ? 'border-accent bg-surface text-fg ring-1 ring-accent/30'
      : 'border-edge/50 bg-surface-raised/30 text-fg hover:border-edge',
  );

  if (isLongText) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className={cn(sharedClass, 'min-h-[60px] resize-y')}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        rows={3}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      className={cn(sharedClass, 'h-7')}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
