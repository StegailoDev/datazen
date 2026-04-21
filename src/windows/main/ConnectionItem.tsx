import { useCallback } from 'react';
import type { ConnectionConfig, DatabaseType } from '../../types';
import type { ConnectionStatus } from '../../stores/activeConnectionStore';
import { cn } from '../../lib/cn';

function dbIcon(t: DatabaseType): { label: string; bg: string } {
  switch (t) {
    case 'postgresql':
      return { label: 'Pg', bg: 'bg-blue-600' };
    case 'mysql':
      return { label: 'My', bg: 'bg-orange-500' };
    case 'mariadb':
      return { label: 'Ma', bg: 'bg-sky-600' };
    case 'sqlite':
      return { label: 'Lt', bg: 'bg-emerald-600' };
    default:
      return { label: 'DB', bg: 'bg-gray-500' };
  }
}

export interface ConnectionItemProps {
  connection: ConnectionConfig;
  status: ConnectionStatus;
  selected: boolean;
  isDragging?: boolean;
  onSelect: (id: string) => void;
  onConnect: (cfg: ConnectionConfig) => void;
  onContextMenu: (e: React.MouseEvent, cfg: ConnectionConfig) => void;
  onPointerDown: (e: React.PointerEvent, cfg: ConnectionConfig) => void;
}

export function ConnectionItem({
  connection,
  status,
  selected,
  isDragging,
  onSelect,
  onConnect,
  onContextMenu,
  onPointerDown,
}: ConnectionItemProps) {
  const { label, bg } = dbIcon(connection.databaseType);
  const isConnected = status === 'connected';
  const isLocal = connection.host === 'localhost' || connection.host === '127.0.0.1';
  const addr =
    connection.databaseType === 'sqlite'
      ? (connection.database ?? 'SQLite')
      : `${connection.host ?? 'localhost'} : ${connection.database ?? ''}`;

  const handleDoubleClick = useCallback(() => {
    onConnect(connection);
  }, [connection, onConnect]);

  const handleClick = useCallback(() => {
    onSelect(connection.id);
  }, [connection.id, onSelect]);

  return (
    <div
      data-conn-item
      className={cn(
        'group flex cursor-default select-none items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isDragging && 'opacity-40',
        selected
          ? 'bg-blue-500/10 ring-1 ring-blue-500/30'
          : 'hover:bg-surface-raised/60',
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu(e, connection)}
      onPointerDown={(e) => onPointerDown(e, connection)}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-sm',
          bg,
        )}
      >
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-fg">{connection.name}</span>
          {isLocal && (
            <span className="text-[11px] font-medium text-green-500">(local)</span>
          )}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-fg-muted">{addr}</div>
      </div>
      {isConnected && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" title="已连接" />
      )}
    </div>
  );
}
