import { useCallback, useMemo, useRef, useState } from 'react';

const DEFAULT_COL_WIDTH = 150;
const MIN_COL_WIDTH = 60;
const MAX_COL_WIDTH = 400;
const HEADER_CHAR_PX = 6.5;
const DATA_CHAR_PX = 7.5;
const CELL_PADDING = 24;
const SAMPLE_ROWS = 20;

export const SORT_ICON_WIDTH = 36;

export function computeInitialColumnWidths(
  columns: { name: string; type?: string }[],
  rows: unknown[][],
): number[] {
  return columns.map((col, colIdx) => {
    const t = (col.type ?? '').toLowerCase();

    let typeWidth: number;
    if (t.includes('bool')) {
      typeWidth = 80;
    } else if (t.includes('serial') || t.includes('bigint') || t === 'integer' || t === 'int4' || t === 'int2' || t === 'smallint') {
      typeWidth = 90;
    } else if (t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double') || t.includes('real')) {
      typeWidth = 100;
    } else if (t.includes('timestamp') || t.includes('date')) {
      typeWidth = 180;
    } else if (t.includes('json')) {
      typeWidth = 260;
    } else if (t.includes('text') || t.includes('char') || t.includes('varchar')) {
      typeWidth = 150;
    } else {
      typeWidth = DEFAULT_COL_WIDTH;
    }

    const headerWidth = col.name.length * HEADER_CHAR_PX + CELL_PADDING;

    let dataWidth = 0;
    const sampleCount = Math.min(rows.length, SAMPLE_ROWS);
    for (let r = 0; r < sampleCount; r++) {
      const cell = rows[r]?.[colIdx];
      if (cell == null) continue;
      const str = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
      const w = str.length * DATA_CHAR_PX + CELL_PADDING;
      if (w > dataWidth) dataWidth = w;
    }

    return Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, typeWidth, headerWidth, dataWidth));
  });
}

export interface UseColumnResizeOptions {
  /** Column definitions for smart width calculation. */
  columns?: { name: string; type?: string }[];
  /** First page of rows for data-aware width calculation. */
  rows?: unknown[][];
  /** Number of columns (fallback when columns not provided). */
  count: number;
  /** Default width per column (px). */
  defaultWidth?: number;
  /** Minimum width per column (px). */
  minWidth?: number;
}

export function useColumnResize({
  columns,
  rows,
  count,
  defaultWidth = DEFAULT_COL_WIDTH,
  minWidth = MIN_COL_WIDTH,
}: UseColumnResizeOptions) {
  const smartWidths = useMemo(
    () => columns && columns.length > 0
      ? computeInitialColumnWidths(columns, rows ?? [])
      : null,
    // Re-compute only when column count changes (not on every row change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns?.length, columns?.map((c) => c.name).join(',')],
  );

  const [widths, setWidths] = useState<number[]>(() =>
    smartWidths ?? Array.from({ length: count }, () => defaultWidth),
  );

  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  if (widths.length !== count) {
    const fallback = smartWidths ?? Array.from({ length: count }, () => defaultWidth);
    const next = Array.from({ length: count }, (_, i) => widths[i] ?? fallback[i] ?? defaultWidth);
    setWidths(next);
  }

  const onResizeStart = useCallback(
    (colIndex: number, startX: number) => {
      const startWidth = widthsRef.current[colIndex] ?? defaultWidth;

      const onMove = (e: PointerEvent) => {
        const delta = e.clientX - startX;
        const next = Math.max(minWidth, startWidth + delta);
        setWidths((prev) => {
          const copy = [...prev];
          copy[colIndex] = next;
          return copy;
        });
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [defaultWidth, minWidth],
  );

  return { columnWidths: widths, onResizeStart };
}

export function adjustWidthsForSort(
  widths: number[],
  columns: { name: string }[],
  sorts: { column: string; descending?: boolean }[],
): number[] {
  if (sorts.length === 0) return widths;
  const sortedCol = sorts[0].column;
  return widths.map((w, i) =>
    columns[i]?.name === sortedCol ? w + SORT_ICON_WIDTH : w,
  );
}
