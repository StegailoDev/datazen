import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TableHeader } from '../TableHeader';
import type { SortCondition } from '../../../types';

const COLS = [
  { id: 'id', name: 'id', type: 'bigint' },
  { id: 'name', name: 'name', type: 'varchar' },
  { id: 'price', name: 'price', type: 'numeric' },
];

describe('TableHeader sort icon visibility', () => {
  it('hides sort icon for unsorted columns', () => {
    const { container } = render(
      <TableHeader
        columns={COLS}
        sorts={[]}
        onSort={() => {}}
        sortable
      />,
    );
    const sortIcons = container.querySelectorAll('svg');
    // No sort icons should be visible when nothing is sorted
    expect(sortIcons.length).toBe(0);
  });

  it('shows sort icon only for the actively sorted column', () => {
    const sorts: SortCondition[] = [{ column: 'name', descending: false }];
    const { container } = render(
      <TableHeader
        columns={COLS}
        sorts={sorts}
        onSort={() => {}}
        sortable
      />,
    );
    const sortIcons = container.querySelectorAll('svg');
    // Only one sort icon (ArrowUp for asc)
    expect(sortIcons.length).toBe(1);
  });

  it('triggers onSort when column header is double-clicked', () => {
    const onSort = vi.fn();
    const { container } = render(
      <TableHeader
        columns={COLS}
        sorts={[]}
        onSort={onSort}
        sortable
      />,
    );
    // Double-click the "name" column header area
    const headers = container.querySelectorAll('[data-col-header]');
    fireEvent.doubleClick(headers[1]); // "name" column
    expect(onSort).toHaveBeenCalledWith({ column: 'name', descending: false });
  });

  it('does not trigger sort on single click', () => {
    const onSort = vi.fn();
    const { container } = render(
      <TableHeader
        columns={COLS}
        sorts={[]}
        onSort={onSort}
        sortable
      />,
    );
    const headers = container.querySelectorAll('[data-col-header]');
    fireEvent.click(headers[1]);
    expect(onSort).not.toHaveBeenCalled();
  });

  it('text container fills available space when sort icon is hidden', () => {
    const { container } = render(
      <TableHeader columns={COLS} sorts={[]} onSort={() => {}} sortable />,
    );
    const headers = container.querySelectorAll('[data-col-header]');
    const textContainer = headers[0].querySelector('[data-col-label]')!;
    expect(textContainer.className).toContain('flex-1');
  });

  it('text container fills remaining space when sort icon is shown', () => {
    const sorts: SortCondition[] = [{ column: 'id', descending: false }];
    const { container } = render(
      <TableHeader columns={COLS} sorts={sorts} onSort={() => {}} sortable />,
    );
    const headers = container.querySelectorAll('[data-col-header]');
    const textContainer = headers[0].querySelector('[data-col-label]')!;
    expect(textContainer.className).toContain('flex-1');
  });

  it('single-clicking the sort icon toggles sort direction', () => {
    const onSort = vi.fn();
    const sorts: SortCondition[] = [{ column: 'name', descending: false }];
    const { container } = render(
      <TableHeader columns={COLS} sorts={sorts} onSort={onSort} sortable />,
    );
    const icon = container.querySelector('[data-sort-icon]')!;
    fireEvent.click(icon);
    expect(onSort).toHaveBeenCalledWith({ column: 'name', descending: true });
  });

  it('single-clicking desc sort icon toggles back to asc', () => {
    const onSort = vi.fn();
    const sorts: SortCondition[] = [{ column: 'price', descending: true }];
    const { container } = render(
      <TableHeader columns={COLS} sorts={sorts} onSort={onSort} sortable />,
    );
    const icon = container.querySelector('[data-sort-icon]')!;
    fireEvent.click(icon);
    expect(onSort).toHaveBeenCalledWith({ column: 'price', descending: false });
  });
});
