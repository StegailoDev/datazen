import { describe, expect, it } from 'vitest';
import { formatCell, formatResultCell } from '../formatters';

describe('formatCell', () => {
  it('returns "NULL" for null', () => {
    expect(formatCell(null)).toBe('NULL');
  });

  it('returns "NULL" for undefined', () => {
    expect(formatCell(undefined)).toBe('NULL');
  });

  it('returns "true"/"false" for booleans', () => {
    expect(formatCell(true)).toBe('true');
    expect(formatCell(false)).toBe('false');
  });

  it('stringifies plain objects as JSON', () => {
    expect(formatCell({ key: 'value' })).toBe('{"key":"value"}');
  });

  it('stringifies arrays as JSON', () => {
    expect(formatCell([1, 2, 3])).toBe('[1,2,3]');
  });

  it('stringifies nested objects as JSON', () => {
    const nested = { a: { b: [1, 2] }, c: 'test' };
    expect(formatCell(nested)).toBe(JSON.stringify(nested));
  });

  it('returns string values as-is', () => {
    expect(formatCell('hello')).toBe('hello');
  });

  it('converts numbers to string', () => {
    expect(formatCell(42)).toBe('42');
    expect(formatCell(3.14)).toBe('3.14');
  });
});

describe('formatResultCell', () => {
  it('returns "NULL" for null', () => {
    expect(formatResultCell(null)).toBe('NULL');
  });

  it('returns "NULL" for undefined', () => {
    expect(formatResultCell(undefined)).toBe('NULL');
  });

  it('stringifies objects as JSON instead of [object Object]', () => {
    const obj = { name: 'test', count: 42 };
    const result = formatResultCell(obj);
    expect(result).not.toBe('[object Object]');
    expect(result).toBe(JSON.stringify(obj));
  });

  it('stringifies arrays as JSON instead of joining', () => {
    const arr = [1, 2, 3];
    const result = formatResultCell(arr);
    expect(result).toBe('[1,2,3]');
  });

  it('returns string values as-is', () => {
    expect(formatResultCell('hello')).toBe('hello');
  });

  it('converts numbers to string', () => {
    expect(formatResultCell(42)).toBe('42');
  });

  it('converts booleans to string', () => {
    expect(formatResultCell(true)).toBe('true');
    expect(formatResultCell(false)).toBe('false');
  });
});
