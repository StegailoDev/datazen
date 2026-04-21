import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
} from 'lucide-react';
import { Menu, MenuItem, Submenu, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { StatusBar } from '../../components/StatusBar';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { TrafficLights } from '../../components/TrafficLights';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useResizable } from '../../hooks/useResizable';
import { useTauriEvent } from '../../hooks/useTauriEvent';
import { useThemeListener } from '../../hooks/useThemeListener';
import { groupConnections, useConnectionStore } from '../../stores/connectionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { useActiveConnectionStore } from '../../stores/activeConnectionStore';
import { cn } from '../../lib/cn';
import { listenCrossWindow } from '../../lib/crossWindowBus';
import { openConnectionWindow, openDataSyncWindow, openNewConnectionWindow, openSettingsWindow } from '../../lib/windowManager';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ActionPanel } from './ActionPanel';
import { ConnectionItem } from './ConnectionItem';
import type { ConnectionConfig } from '../../types';

// ─── Main Window ────────────────────────────────────────────────────

export function MainWindow() {
  useTauriEvent();
  useThemeListener();

  const fetchConnections = useConnectionStore((s) => s.fetchConnections);
  const fetchGroups = useConnectionStore((s) => s.fetchGroups);
  const connections = useConnectionStore((s) => s.connections);
  const groups = useConnectionStore((s) => s.groups);
  const searchQuery = useConnectionStore((s) => s.searchQuery);
  const setSearchQuery = useConnectionStore((s) => s.setSearchQuery);
  const addGroup = useConnectionStore((s) => s.addGroup);
  const renameGroup = useConnectionStore((s) => s.renameGroup);
  const deleteGroup = useConnectionStore((s) => s.deleteGroup);
  const duplicateConnection = useConnectionStore((s) => s.duplicateConnection);
  const deleteConnection = useConnectionStore((s) => s.deleteConnection);
  const moveConnectionToGroup = useConnectionStore((s) => s.moveConnectionToGroup);
  const loading = useConnectionStore((s) => s.loading);
  const error = useConnectionStore((s) => s.error);

  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const mainSidebarWidth = useUiStore((s) => s.mainSidebarWidth);
  const setMainSidebarWidth = useUiStore((s) => s.setMainSidebarWidth);

  const connectAction = useActiveConnectionStore((s) => s.connect);
  const disconnectAction = useActiveConnectionStore((s) => s.disconnect);
  const activeConnections = useActiveConnectionStore((s) => s.connections);

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Inline rename state
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // New group dialog state
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // ── Pointer-based drag state ──
  const [draggingConnId, setDraggingConnId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragConnRef = useRef<ConnectionConfig | null>(null);
  const dragActiveRef = useRef(false);
  const groupRectsRef = useRef<Map<string, DOMRect>>(new Map());

  const lastError = useMemo(() => {
    for (const entry of Object.values(activeConnections)) {
      if (entry.status === 'error' && entry.error) return entry.error;
    }
    return null;
  }, [activeConnections]);

  useEffect(() => {
    if (lastError) {
      setErrorMessage(lastError);
      setErrorDialogOpen(true);
    }
  }, [lastError]);

  // ── Init ──
  useEffect(() => {
    void fetchConnections();
    void fetchGroups();
    void loadSettings();
  }, [fetchConnections, fetchGroups, loadSettings]);

  // Auto-expand: on first load expand all; when groups change, expand any new ones
  useEffect(() => {
    if (groups.length === 0) return;
    setExpandedGroups((prev) => {
      if (prev.size === 0) {
        return new Set([...groups, '']);
      }
      const hasNew = groups.some((g) => !prev.has(g));
      if (!hasNew) return prev;
      const next = new Set(prev);
      for (const g of groups) next.add(g);
      return next;
    });
  }, [groups]);

  // ── Cross-window events ──
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listenCrossWindow('datazen:connection-closed', (payload) => {
      const data = payload as { connectionId?: string } | undefined;
      if (data?.connectionId) {
        useActiveConnectionStore.getState().removeByConnectionId(data.connectionId);
      }
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void listenCrossWindow('menu:open-settings', () => {
      if (!cancelled) openSettingsWindow();
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else cleanup = unlisten;
    });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  // (native context menus handle their own dismiss)

  const handleConnect = useCallback(async (cfg: ConnectionConfig) => {
    await connectAction(cfg);
    const entry = useActiveConnectionStore.getState().connections[cfg.id];
    if (entry?.status === 'connected' && entry.connectionId) {
      openConnectionWindow(entry.connectionId, cfg.name, cfg.database, cfg.databaseType);
    }
  }, [connectAction]);

  const { size: sidebarWidth, handleRef } = useResizable({
    direction: 'horizontal',
    initialSize: mainSidebarWidth,
    minSize: 160,
    maxSize: 320,
    storageKey: 'main.sidebar',
  });

  useEffect(() => {
    setMainSidebarWidth(sidebarWidth);
  }, [setMainSidebarWidth, sidebarWidth]);

  // ── Grouped connections ──
  const grouped = useMemo(
    () => groupConnections(connections, groups, searchQuery),
    [connections, groups, searchQuery],
  );

  // ── Keyboard shortcuts ──
  useKeyboardShortcuts([
    { key: 'mod+n', scope: 'global', description: '新建连接', action: () => openNewConnectionWindow() },
  ]);

  // ── Status ──
  const activeCount = useMemo(
    () => Object.values(activeConnections).filter((e) => e.status === 'connected').length,
    [activeConnections],
  );

  const statusLeft = (() => {
    if (loading) return '加载中…';
    if (error) return <span className="text-red-400">{error}</span>;
    if (activeCount > 0) return <span className="text-green-400">{activeCount} 个活跃连接</span>;
    return '就绪';
  })();

  // ── Helpers ──

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  // ── Native context menus (Tauri Menu API) ──

  const handleGroupContextMenu = useCallback(async (e: React.MouseEvent, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isUngrouped = groupName === '';

    const items: Array<MenuItem | PredefinedMenuItem> = [
      await MenuItem.new({ text: '新建分组', action: () => { setNewGroupName(''); setNewGroupDialogOpen(true); } }),
    ];
    if (!isUngrouped) {
      items.push(
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await MenuItem.new({ text: '重命名分组', action: () => { setRenamingGroup(groupName); setRenameValue(groupName); } }),
        await MenuItem.new({ text: '删除分组', action: () => { void deleteGroup(groupName); } }),
      );
    }
    const menu = await Menu.new({ items });
    await menu.popup();
  }, [deleteGroup]);

  const handleConnectionContextMenu = useCallback(async (e: React.MouseEvent, conn: ConnectionConfig) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(conn.id);

    const isConnected = activeConnections[conn.id]?.status === 'connected';
    const items: Array<MenuItem | Submenu | PredefinedMenuItem> = [
      await MenuItem.new({
        text: isConnected ? '断开连接' : '打开连接',
        action: () => { if (isConnected) void disconnectAction(conn.id); else void handleConnect(conn); },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({ text: '编辑连接', action: () => openNewConnectionWindow(conn.id) }),
      await MenuItem.new({ text: '复制连接', action: () => { void duplicateConnection(conn.id); } }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
    ];

    const moveTargets = groups.filter((g) => g !== conn.group);
    if (moveTargets.length > 0 || conn.group) {
      const subItems: MenuItem[] = [];
      for (const g of moveTargets) {
        subItems.push(await MenuItem.new({ text: g, action: () => { void moveConnectionToGroup(conn.id, g); } }));
      }
      if (conn.group) {
        subItems.push(await MenuItem.new({ text: '移除分组', action: () => { void moveConnectionToGroup(conn.id, undefined); } }));
      }
      items.push(await Submenu.new({ text: '移动到分组', items: subItems }));
      items.push(await PredefinedMenuItem.new({ item: 'Separator' }));
    }

    items.push(await MenuItem.new({ text: '删除连接', action: () => { void deleteConnection(conn.id); } }));
    const menu = await Menu.new({ items });
    await menu.popup();
  }, [activeConnections, groups, disconnectAction, handleConnect, duplicateConnection, deleteConnection, moveConnectionToGroup]);

  // ── Pointer-based drag & drop ──

  const snapshotGroupRects = useCallback(() => {
    const map = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>('[data-group-name]').forEach((el) => {
      const name = el.dataset.groupName ?? '';
      map.set(name, el.getBoundingClientRect());
    });
    groupRectsRef.current = map;
  }, []);

  const hitTestGroup = useCallback((x: number, y: number): string | null => {
    for (const [name, rect] of groupRectsRef.current) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return name;
      }
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, conn: ConnectionConfig) => {
    if (e.button !== 0) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragConnRef.current = conn;
    dragActiveRef.current = false;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragStartPos.current || !dragConnRef.current) return;

      if (!dragActiveRef.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragActiveRef.current = true;
        snapshotGroupRects();
        setDraggingConnId(dragConnRef.current.id);
      }

      setDragGhostPos({ x: e.clientX, y: e.clientY });

      const overGroup = hitTestGroup(e.clientX, e.clientY);
      setDragOverGroup(overGroup);
    };

    const onUp = (e: PointerEvent) => {
      if (!dragConnRef.current) return;

      if (dragActiveRef.current) {
        const targetGroup = hitTestGroup(e.clientX, e.clientY);
        const conn = dragConnRef.current;
        if (targetGroup !== null && targetGroup !== (conn.group || '')) {
          void moveConnectionToGroup(conn.id, targetGroup || undefined);
        }
      }

      dragStartPos.current = null;
      dragConnRef.current = null;
      dragActiveRef.current = false;
      setDraggingConnId(null);
      setDragOverGroup(null);
      setDragGhostPos(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [snapshotGroupRects, hitTestGroup, moveConnectionToGroup]);

  // ── Rename submit ──

  const submitRename = useCallback(() => {
    if (renamingGroup !== null && renameValue.trim()) {
      void renameGroup(renamingGroup, renameValue.trim());
    }
    setRenamingGroup(null);
  }, [renamingGroup, renameValue, renameGroup]);

  // ── Backup / Restore handlers ──

  const handleBackup = useCallback(async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        title: '选择备份保存位置',
        filters: [{ name: 'SQL Files', extensions: ['sql'] }],
      });
      if (!path) return;
      if (!selectedId) {
        setErrorMessage('请先选择一个连接');
        setErrorDialogOpen(true);
        return;
      }
      const conn = connections.find((c) => c.id === selectedId);
      if (!conn) return;

      const entry = activeConnections[conn.id];
      if (entry?.status !== 'connected' || !entry.connectionId) {
        setErrorMessage('请先连接到数据库后再进行备份');
        setErrorDialogOpen(true);
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('backup_database', {
        connectionId: entry.connectionId,
        outputPath: path,
      });
      setErrorMessage(`备份成功：${path}`);
      setErrorDialogOpen(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setErrorDialogOpen(true);
    }
  }, [selectedId, connections, activeConnections]);

  const handleRestore = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({
        title: '选择要恢复的 SQL 文件',
        filters: [{ name: 'SQL Files', extensions: ['sql'] }],
        multiple: false,
      });
      if (!path) return;

      if (!selectedId) {
        setErrorMessage('请先选择一个连接');
        setErrorDialogOpen(true);
        return;
      }
      const conn = connections.find((c) => c.id === selectedId);
      if (!conn) return;

      const entry = activeConnections[conn.id];
      if (entry?.status !== 'connected' || !entry.connectionId) {
        setErrorMessage('请先连接到数据库后再进行恢复');
        setErrorDialogOpen(true);
        return;
      }

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('restore_database', {
        connectionId: entry.connectionId,
        inputPath: typeof path === 'string' ? path : (path as unknown as string),
      });
      setErrorMessage('恢复成功！');
      setErrorDialogOpen(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
      setErrorDialogOpen(true);
    }
  }, [selectedId, connections, activeConnections]);

  // ── Blank area context menu ──

  const handleBlankContextMenu = useCallback(async (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-group-header]') || el.closest('[data-conn-item]')) return;
    e.preventDefault();
    const menu = await Menu.new({
      items: [
        await MenuItem.new({ text: '新建分组', action: () => { setNewGroupName(''); setNewGroupDialogOpen(true); } }),
        await MenuItem.new({ text: '新建连接', action: () => openNewConnectionWindow() }),
      ],
    });
    await menu.popup();
  }, []);

  return (
    <div className="flex h-screen min-h-0 min-w-[520px] flex-col bg-surface text-fg">
      {/* ── Title bar ── */}
      <header className="relative flex h-10 min-h-[40px] shrink-0 items-center bg-titlebar">
        <div className="absolute inset-0" data-tauri-drag-region />
        <div className="relative z-10 px-3">
          <TrafficLights />
        </div>
        <div className="pointer-events-none flex min-w-0 flex-1 justify-center">
          <div className="truncate text-xs font-medium text-fg-secondary">DataZen</div>
        </div>
        <div className="relative z-10 pr-3">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1">
        {/* ── Left action panel ── */}
        <aside
          style={{ width: sidebarWidth }}
          className="shrink-0 border-r border-edge bg-surface-alt"
        >
          <ActionPanel
            onNewConnection={() => openNewConnectionWindow()}
            onBackup={() => void handleBackup()}
            onRestore={() => void handleRestore()}
            onDataSync={() => openDataSyncWindow()}
          />
        </aside>
        <div
          ref={handleRef}
          className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-blue-500/30"
          title="拖拽调整侧边栏宽度"
        />

        {/* ── Main content ── */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* ── Search bar ── */}
          <div className="flex shrink-0 items-center gap-2 border-b border-edge px-4 py-2">
            <button
              type="button"
              onClick={() => openNewConnectionWindow()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-raised hover:text-fg"
              title="新建连接"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="查找连接…"
                className="h-8 pl-8 text-[13px]"
              />
            </div>
          </div>

          {/* ── Grouped connection list ── */}
          <div
            className="flex-1 overflow-auto"
            onContextMenu={handleBlankContextMenu}
          >
            {grouped.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-sm text-fg-muted">
                <p>没有连接</p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => openNewConnectionWindow()}
                >
                  <Plus className="h-4 w-4" />
                  新建连接
                </Button>
              </div>
            )}
            {grouped.map(({ group: groupName, connections: groupConns }) => {
              const expanded = expandedGroups.has(groupName);
              const displayName = groupName || '未分组';
              const isDragOver = dragOverGroup === groupName;

              return (
                <div
                  key={groupName}
                  data-group-name={groupName}
                  className={cn(
                    'transition-colors',
                    isDragOver && draggingConnId && 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/30',
                  )}
                >
                  {/* ── Group header ── */}
                  <div
                    data-group-header
                    className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 hover:bg-surface-raised/50"
                    onClick={() => toggleGroup(groupName)}
                    onContextMenu={(e) => { void handleGroupContextMenu(e, groupName); }}
                  >
                    {expanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-fg-muted" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-fg-muted" />
                    )}
                    {renamingGroup === groupName ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') setRenamingGroup(null);
                        }}
                        onBlur={submitRename}
                        className="h-6 flex-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <span className="text-[13px] font-semibold text-fg">{displayName}</span>
                        <span className="text-[11px] text-fg-muted">({groupConns.length})</span>
                      </>
                    )}
                  </div>

                  {/* ── Connections ── */}
                  {expanded && (
                    <div className="px-2 pb-2">
                      {groupConns.map((conn) => (
                        <ConnectionItem
                          key={conn.id}
                          connection={conn}
                          status={activeConnections[conn.id]?.status ?? 'idle'}
                          selected={selectedId === conn.id}
                          isDragging={draggingConnId === conn.id}
                          onSelect={setSelectedId}
                          onConnect={handleConnect}
                          onContextMenu={handleConnectionContextMenu}
                          onPointerDown={handlePointerDown}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Drag ghost overlay ── */}
          {draggingConnId && dragGhostPos && (() => {
            const conn = connections.find((c) => c.id === draggingConnId);
            if (!conn) return null;
            return (
              <div
                className="pointer-events-none fixed z-[9999] rounded-lg border border-blue-500/40 bg-surface-alt px-3 py-2 text-[13px] font-medium text-fg shadow-xl"
                style={{ left: dragGhostPos.x + 12, top: dragGhostPos.y + 12 }}
              >
                {conn.name}
              </div>
            );
          })()}
        </main>
      </div>

      {/* ── New group dialog ── */}
      <Dialog
        open={newGroupDialogOpen}
        title="新建分组"
        onClose={() => setNewGroupDialogOpen(false)}
        className="max-w-sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewGroupDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (newGroupName.trim()) {
                  void addGroup(newGroupName.trim());
                }
                setNewGroupDialogOpen(false);
              }}
            >
              确定
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (newGroupName.trim()) {
                void addGroup(newGroupName.trim());
              }
              setNewGroupDialogOpen(false);
            }
          }}
          placeholder="请输入分组名称"
          className="text-sm"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </Dialog>

      {/* ── Error / info dialog ── */}
      <Dialog
        open={errorDialogOpen}
        title="提示"
        onClose={() => setErrorDialogOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setErrorDialogOpen(false)}>
            确定
          </Button>
        }
      >
        <p className="whitespace-pre-wrap break-all text-sm text-fg-secondary">{errorMessage}</p>
      </Dialog>

      {/* ── Status bar ── */}
      <StatusBar
        left={
          <span className="truncate">
            {statusLeft}
            <span className="mx-2 text-edge">|</span>
            <span title="连接数量">连接：{connections.length}</span>
          </span>
        }
        right={<span className="tabular-nums">DataZen v1.0.0</span>}
      />
    </div>
  );
}
