import { act, renderHook } from '@testing-library/react';
import useResponsePaneErrors from './index';

const collection = { uid: 'col-1', items: [] };

const itemWithErrors = (requestUid) => ({
  uid: 'req-1',
  requestUid,
  postResponseScriptErrorMessage: 'Post-response script failed',
  testScriptErrorMessage: 'Test script failed'
});

const renderErrors = (item, { isResponseTabActive = true, showResponseTab = jest.fn() } = {}) => renderHook(
  ({ item, isResponseTabActive }) => useResponsePaneErrors(item, collection, { isResponseTabActive, showResponseTab }),
  { initialProps: { item, isResponseTabActive } }
);

describe('useResponsePaneErrors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the card by default', () => {
    const { result } = renderErrors(itemWithErrors('run-1'));

    expect(result.current.errors).toHaveLength(2);
    expect(result.current.isCardRemoved).toBe(false);
    expect(result.current.isCardFullPane).toBe(false);
  });

  it('hides the card for the current requestUid on close and shows it again on reopen', () => {
    const { result } = renderErrors(itemWithErrors('run-1'));

    act(() => result.current.closeCard());
    expect(result.current.isCardRemoved).toBe(true);

    act(() => result.current.reopenCard());
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('shows the card again for a new requestUid', () => {
    const { result, rerender } = renderErrors(itemWithErrors('run-1'));
    act(() => result.current.closeCard());

    rerender({ isResponseTabActive: true, item: itemWithErrors('run-2') });
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('takes the card out of full pane for a new requestUid', () => {
    const { result, rerender } = renderErrors(itemWithErrors('run-1'));
    act(() => result.current.toggleCardFullPane());

    rerender({ isResponseTabActive: true, item: itemWithErrors('run-2') });
    expect(result.current.isCardFullPane).toBe(false);
  });

  it('is not full pane when there are no errors or the card is closed', () => {
    const { result, rerender } = renderErrors(itemWithErrors('run-1'));
    act(() => result.current.toggleCardFullPane());

    rerender({ isResponseTabActive: true, item: { uid: 'req-1', requestUid: 'run-1' } });
    expect(result.current.isCardFullPane).toBe(false);

    rerender({ isResponseTabActive: true, item: itemWithErrors('run-1') });
    act(() => result.current.closeCard());
    act(() => result.current.reopenCard());
    expect(result.current.isCardFullPane).toBe(false);
  });

  it('shows, closes and reopens the card after a cancel clears the requestUid', () => {
    const { result } = renderErrors({ ...itemWithErrors(null), requestSent: { timestamp: 1000 } });
    expect(result.current.isCardRemoved).toBe(false);
    expect(result.current.isCardFullPane).toBe(false);

    act(() => result.current.closeCard());
    expect(result.current.isCardRemoved).toBe(true);

    act(() => result.current.reopenCard());
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('shows the card again for the next cancelled run after closing it on a cancelled run', () => {
    const { result, rerender } = renderErrors({ ...itemWithErrors(null), requestSent: { timestamp: 1000 } });
    act(() => result.current.closeCard());

    rerender({ isResponseTabActive: true, item: { ...itemWithErrors(null), requestSent: { timestamp: 2000 } } });
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('removes the card for the icon, and leaves full pane, while another response tab is active', () => {
    const { result, rerender } = renderErrors(itemWithErrors('run-1'));
    act(() => result.current.toggleCardFullPane());

    rerender({ item: itemWithErrors('run-1'), isResponseTabActive: false });
    expect(result.current.isCardRemoved).toBe(true);
    expect(result.current.isCardFullPane).toBe(false);
  });

  it('shows the card again when the response tab becomes active', () => {
    const { result, rerender } = renderErrors(itemWithErrors('run-1'), { isResponseTabActive: false });

    rerender({ item: itemWithErrors('run-1'), isResponseTabActive: true });
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('switches to the response tab and shows the card on reopen', () => {
    const showResponseTab = jest.fn();
    const { result, rerender } = renderErrors(itemWithErrors('run-1'), { isResponseTabActive: false, showResponseTab });
    act(() => result.current.closeCard());

    act(() => result.current.reopenCard());
    expect(showResponseTab).toHaveBeenCalledTimes(1);

    rerender({ item: itemWithErrors('run-1'), isResponseTabActive: true });
    expect(result.current.isCardRemoved).toBe(false);
  });

  it('keeps the closed state across a remount', () => {
    const first = renderErrors(itemWithErrors('run-1'));
    act(() => first.result.current.closeCard());
    first.unmount();

    const { result } = renderErrors(itemWithErrors('run-1'));
    expect(result.current.isCardRemoved).toBe(true);
  });

  it('flips isCardFullPane when full pane is toggled', () => {
    const { result } = renderErrors(itemWithErrors('run-1'));

    act(() => result.current.toggleCardFullPane());
    expect(result.current.isCardFullPane).toBe(true);

    act(() => result.current.toggleCardFullPane());
    expect(result.current.isCardFullPane).toBe(false);
  });
});
