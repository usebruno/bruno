import { renderHook, act } from '@testing-library/react';
import usePostmanPackagePrompt from './index';

const reportWith = (needsInstall = ['dayjs'], hasAny = true) => ({
  hasAny,
  needsInstall,
  unsupported: [],
  safeMode: [],
  devMode: []
});

describe('usePostmanPackagePrompt', () => {
  it('starts with no prompt', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('opens the prompt when the report is actionable and a collection path exists', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    const report = reportWith(['dayjs', 'zod']);

    act(() => {
      result.current.handleImportResolved({ packageReport: report }, { path: '/collections/demo' });
    });

    expect(result.current.postmanPackagePrompt).toEqual({
      report,
      collectionPath: '/collections/demo'
    });
  });

  it('does not open when the report has nothing actionable', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    act(() => {
      result.current.handleImportResolved(
        { packageReport: reportWith([], false) },
        { path: '/collections/demo' }
      );
    });
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('does not open when there is no packageReport (non-Postman import)', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    act(() => {
      result.current.handleImportResolved({}, { path: '/collections/demo' });
    });
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('does not open when the imported item has no path', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    act(() => {
      result.current.handleImportResolved({ packageReport: reportWith() }, undefined);
    });
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('clears an open prompt', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    act(() => {
      result.current.handleImportResolved({ packageReport: reportWith() }, { path: '/c' });
    });
    expect(result.current.postmanPackagePrompt).not.toBeNull();

    act(() => {
      result.current.clearPostmanPackagePrompt();
    });
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('queues a prompt per collection on bulk import and steps through them', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    const reportA = reportWith(['ajv']);
    const reportB = reportWith(['zod']);

    act(() => {
      result.current.handleImportResolved(
        [{ packageReport: reportA }, { packageReport: reportB }],
        [{ path: '/c/a' }, { path: '/c/b' }]
      );
    });

    expect(result.current.postmanPackagePrompt).toEqual({ report: reportA, collectionPath: '/c/a' });

    act(() => result.current.clearPostmanPackagePrompt());
    expect(result.current.postmanPackagePrompt).toEqual({ report: reportB, collectionPath: '/c/b' });

    act(() => result.current.clearPostmanPackagePrompt());
    expect(result.current.postmanPackagePrompt).toBeNull();
  });

  it('skips collections in a bulk import that have nothing actionable', () => {
    const { result } = renderHook(() => usePostmanPackagePrompt());
    const empty = reportWith([], false);
    const actionable = reportWith(['ajv']);

    act(() => {
      result.current.handleImportResolved(
        [{ packageReport: empty }, { packageReport: actionable }, { packageReport: empty }],
        [{ path: '/c/empty1' }, { path: '/c/real' }, { path: '/c/empty2' }]
      );
    });

    expect(result.current.postmanPackagePrompt).toEqual({
      report: actionable,
      collectionPath: '/c/real'
    });

    act(() => result.current.clearPostmanPackagePrompt());
    expect(result.current.postmanPackagePrompt).toBeNull();
  });
});
