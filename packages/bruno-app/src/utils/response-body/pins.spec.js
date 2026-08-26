import { pinResponseForTimeline, releaseTimelineBodyPins, pinBodyRef, releaseBodyPin } from './pins';

jest.mock('./client', () => {
  const pin = jest.fn();
  const release = jest.fn();
  return {
    createResponseBodyClient: jest.fn(),
    getResponseBodyClient: () => ({ pin, release }),
    __mocks: { pin, release }
  };
});

const { __mocks } = require('./client');

describe('response-body pin lifecycle', () => {
  beforeEach(() => {
    __mocks.pin.mockReset();
    __mocks.release.mockReset();
    let n = 0;
    __mocks.pin.mockImplementation(async () => `pin-${++n}`);
    __mocks.release.mockResolvedValue({ success: true });
  });

  test('pinResponseForTimeline creates dual pins for active + timeline', async () => {
    const pins = await pinResponseForTimeline('body-1');
    expect(pins).toEqual({ activePinId: 'pin-1', timelinePinId: 'pin-2' });
    expect(__mocks.pin).toHaveBeenCalledTimes(2);
    expect(__mocks.pin).toHaveBeenCalledWith('body-1');
  });

  test('pinResponseForTimeline returns null pins when bodyRef missing', async () => {
    expect(await pinResponseForTimeline(null)).toEqual({
      activePinId: null,
      timelinePinId: null
    });
    expect(__mocks.pin).not.toHaveBeenCalled();
  });

  test('pinBodyRef failure is fail-soft (warn + null)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    __mocks.pin.mockRejectedValueOnce(new Error('ipc down'));
    expect(await pinBodyRef('body-1')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test('releaseTimelineBodyPins releases request and scripted-response pins', async () => {
    await releaseTimelineBodyPins([
      { data: { bodyPinId: 'pin-a' } },
      { data: { response: { bodyPinId: 'pin-b' } } }
    ]);
    expect(__mocks.release.mock.calls.map((c) => c[0])).toEqual(['pin-a', 'pin-b']);
  });

  test('releaseTimelineBodyPins dedupes pin ids within a single entry', async () => {
    await releaseTimelineBodyPins([
      { data: { bodyPinId: 'pin-same', response: { bodyPinId: 'pin-same' } } }
    ]);
    expect(__mocks.release).toHaveBeenCalledTimes(1);
    expect(__mocks.release).toHaveBeenCalledWith('pin-same');
  });

  test('releaseBodyPin ignores empty id and swallows release errors', async () => {
    await releaseBodyPin(null);
    expect(__mocks.release).not.toHaveBeenCalled();

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    __mocks.release.mockRejectedValueOnce(new Error('gone'));
    await releaseBodyPin('pin-x');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
