import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../commands/query', () => ({
  queryCommands: {
    executeQuery: vi.fn(),
    cancelQuery: vi.fn(),
    getQueryHistory: vi.fn().mockResolvedValue([]),
  },
}));

describe('queryStore detail row tracking', () => {
  let useQueryStore: typeof import('../../stores/queryStore').useQueryStore;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../stores/queryStore');
    useQueryStore = mod.useQueryStore;
  });

  it('resultDetailRowIndex defaults to null', () => {
    const state = useQueryStore.getState();
    expect(state.resultDetailRowIndex).toBeNull();
  });

  it('setResultDetailRow sets the row index', () => {
    useQueryStore.getState().setResultDetailRow(3);
    expect(useQueryStore.getState().resultDetailRowIndex).toBe(3);
  });

  it('setResultDetailRow(null) clears the row index', () => {
    useQueryStore.getState().setResultDetailRow(5);
    useQueryStore.getState().setResultDetailRow(null);
    expect(useQueryStore.getState().resultDetailRowIndex).toBeNull();
  });
});
