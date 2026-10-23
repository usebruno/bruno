import { act, renderHook } from '@testing-library/react';
import useExpandedRows from './index';

const renderRows = () => renderHook(() => useExpandedRows(['pre-request', 'test']));

describe('useExpandedRows', () => {
  it('starts with every row collapsed', () => {
    const { result } = renderRows();

    expect(result.current.isRowExpanded('pre-request')).toBe(false);
    expect(result.current.areAllRowsExpanded).toBe(false);
  });

  it('expands and collapses one row without touching the others', () => {
    const { result } = renderRows();

    act(() => result.current.toggleRow('test'));
    expect(result.current.isRowExpanded('test')).toBe(true);
    expect(result.current.isRowExpanded('pre-request')).toBe(false);

    act(() => result.current.toggleRow('test'));
    expect(result.current.isRowExpanded('test')).toBe(false);
  });

  it('expands every row, then collapses every row, when toggling all', () => {
    const { result } = renderRows();

    act(() => result.current.toggleAllRows());
    expect(result.current.areAllRowsExpanded).toBe(true);

    act(() => result.current.toggleAllRows());
    expect(result.current.isRowExpanded('pre-request')).toBe(false);
    expect(result.current.isRowExpanded('test')).toBe(false);
  });

  it('expands the collapsed rows and keeps the expanded ones open when toggling all with only some expanded', () => {
    const { result } = renderRows();

    act(() => result.current.toggleRow('test'));
    expect(result.current.areAllRowsExpanded).toBe(false);

    act(() => result.current.toggleAllRows());
    expect(result.current.isRowExpanded('pre-request')).toBe(true);
    expect(result.current.isRowExpanded('test')).toBe(true);
  });

  it('counts as all expanded once the last collapsed row is expanded by hand', () => {
    const { result } = renderRows();

    act(() => result.current.toggleRow('pre-request'));
    act(() => result.current.toggleRow('test'));
    expect(result.current.areAllRowsExpanded).toBe(true);
  });
});
