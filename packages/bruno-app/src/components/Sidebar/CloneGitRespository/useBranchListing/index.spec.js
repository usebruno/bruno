import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { fetchBranchesForRepositoryUrl } from 'providers/ReduxStore/slices/collections/actions';
import useBranchListing, { EMPTY_BRANCH_LISTING } from './index';

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  fetchBranchesForRepositoryUrl: jest.fn()
}));

const API_URL = 'https://github.com/acme/api.git';
const WEB_URL = 'https://github.com/acme/web.git';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderListing = (initialUrl, canList = () => true) => {
  const store = configureStore({ reducer: { app: () => ({}) } });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return renderHook(({ url }) => useBranchListing(url, { canList }), { wrapper, initialProps: { url: initialUrl } });
};

const settle = async (ms = 500) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('useBranchListing', () => {
  let replies;

  beforeEach(() => {
    jest.useFakeTimers();
    replies = {};
    fetchBranchesForRepositoryUrl.mockImplementation((url) => () => {
      replies[url] = deferred();
      return replies[url].promise;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('lists the branches of a URL after the debounce, with its default branch', async () => {
    const { result } = renderListing(API_URL);
    await settle();
    expect(fetchBranchesForRepositoryUrl).toHaveBeenCalledWith(API_URL);
    expect(result.current).toEqual({ ...EMPTY_BRANCH_LISTING, loading: true });

    await act(async () => {
      replies[API_URL].resolve({ branches: ['dev', 'main'], defaultBranch: 'main' });
    });

    expect(result.current).toEqual({ branches: ['dev', 'main'], defaultBranch: 'main', loading: false, failed: false });
  });

  it('shows loading without the old branches while a new URL is still being typed', async () => {
    const { result, rerender } = renderListing(API_URL);
    await settle();
    await act(async () => {
      replies[API_URL].resolve({ branches: ['main'], defaultBranch: 'main' });
    });

    rerender({ url: WEB_URL });

    expect(result.current).toEqual({ ...EMPTY_BRANCH_LISTING, loading: true });
    expect(fetchBranchesForRepositoryUrl).toHaveBeenCalledTimes(1);
  });

  it('never returns the previous URL\'s branches for a new URL, even on the render where the debounce catches up', async () => {
    const store = configureStore({ reducer: { app: () => ({}) } });
    const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const renders = [];
    const { rerender } = renderHook(({ url }) => {
      const listing = useBranchListing(url, { canList: () => true });
      renders.push({ url, listing });
      return listing;
    }, { wrapper, initialProps: { url: API_URL } });
    await settle();
    await act(async () => {
      replies[API_URL].resolve({ branches: ['main'], defaultBranch: 'main' });
    });

    rerender({ url: WEB_URL });
    await settle();

    const webRenders = renders.filter((entry) => entry.url === WEB_URL);
    expect(webRenders.length).toBeGreaterThan(0);
    webRenders.forEach(({ listing }) => {
      expect(listing).toEqual({ ...EMPTY_BRANCH_LISTING, loading: true });
    });
  });

  it('drops an older reply for the same URL after the URL changed away and back', async () => {
    const calls = [];
    fetchBranchesForRepositoryUrl.mockImplementation((url) => () => {
      const reply = deferred();
      calls.push({ url, reply });
      return reply.promise;
    });
    const { result, rerender } = renderListing(API_URL);
    await settle();
    rerender({ url: WEB_URL });
    await settle();
    rerender({ url: API_URL });
    await settle();
    expect(calls.map(({ url }) => url)).toEqual([API_URL, WEB_URL, API_URL]);

    await act(async () => {
      calls[2].reply.resolve({ branches: ['main'], defaultBranch: 'main' });
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      calls[0].reply.reject(new Error('timed out'));
    });

    expect(result.current).toEqual({ branches: ['main'], defaultBranch: 'main', loading: false, failed: false });
  });

  it('drops a slower reply for a URL that is no longer current', async () => {
    const { result, rerender } = renderListing(API_URL);
    await settle();
    rerender({ url: WEB_URL });
    await settle();

    await act(async () => {
      replies[WEB_URL].resolve({ branches: ['web-main'], defaultBranch: 'web-main' });
    });
    await act(async () => {
      replies[API_URL].resolve({ branches: ['api-main'], defaultBranch: 'api-main' });
    });

    expect(result.current.branches).toEqual(['web-main']);
  });

  it('marks the listing failed when the branches cannot be listed', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderListing(API_URL);
    await settle();

    await act(async () => {
      replies[API_URL].reject(new Error('no access'));
    });

    expect(result.current).toEqual({ ...EMPTY_BRANCH_LISTING, failed: true });
    consoleError.mockRestore();
  });

  it('does not list or show loading for a URL it may not list', async () => {
    const { result, rerender } = renderListing('', (url) => url === API_URL);
    rerender({ url: WEB_URL });
    expect(result.current).toEqual(EMPTY_BRANCH_LISTING);

    await settle();

    expect(fetchBranchesForRepositoryUrl).not.toHaveBeenCalled();
    expect(result.current).toEqual(EMPTY_BRANCH_LISTING);
  });
});
