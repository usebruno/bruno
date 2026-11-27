import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeContext } from 'providers/Theme';
import BodyBlock from '../Common/Body/index';
import Response from './index';

jest.mock('../Common/Body/index', () => jest.fn(() => null));
jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ app: { preferences: { response: { maxPreviewSizeMB: 5 } } } })
}));
jest.mock('../Common/Headers/index', () => () => null);

const theme = {
  colors: { text: { muted: '#888888', warning: '#f59e0b' } },
  requestTabPanel: { responseOk: '#22c55e', responseError: '#ef4444' }
};

const renderResponse = (props) => render(
  <ThemeContext.Provider value={{ theme, displayedTheme: 'light', storedTheme: 'light', setStoredTheme: () => {} }}>
    <Response item={{ uid: 'item-1' }} collection={{}} {...props} />
  </ThemeContext.Provider>
);

const bodyProps = () => BodyBlock.mock.calls.at(-1)[0];

describe('Timeline Response', () => {
  beforeEach(() => BodyBlock.mockClear());

  it('holds back a body over the max preview size', () => {
    renderResponse({ response: { status: 200, data: null, dataBuffer: null, size: 5 * 1024 * 1024 + 1 } });

    expect(bodyProps().isBodyHeldBack).toBe(true);
  });

  it('treats a small empty body as empty', () => {
    renderResponse({ response: { status: 204, data: null, dataBuffer: null, size: 0 } });

    expect(bodyProps().isBodyHeldBack).toBe(false);
  });

  it('hands the body this entry\'s response, not the parent item\'s', () => {
    const size = 5 * 1024 * 1024 + 1;
    renderResponse({
      item: { uid: 'item-1', response: { status: 200, size: 12 } },
      response: { statusCode: 404, statusText: 'Not Found', data: null, dataBuffer: null, size, headers: { 'x-a': '1' }, duration: 40 }
    });

    expect(bodyProps().item).toMatchObject({
      uid: 'item-1',
      response: { status: 404, statusText: 'Not Found', size, headers: { 'x-a': '1' }, duration: 40 }
    });
  });

  it('keeps the stored body id of a held-back runner response so it can still be saved', () => {
    renderResponse({ response: { status: 200, data: null, dataBuffer: null, size: 5 * 1024 * 1024 + 1, storedRequestUid: 'run-1' } });

    expect(bodyProps().item.response.storedRequestUid).toBe('run-1');
  });

  it('does not carry the parent response\'s stored body id onto another entry', () => {
    renderResponse({
      item: { uid: 'item-1', response: { status: 200, size: 5 * 1024 * 1024 + 1, storedRequestUid: 'run-1' } },
      response: { status: 200, data: { token: 'abc' }, size: 15 }
    });

    expect(bodyProps().item.response).not.toHaveProperty('storedRequestUid');
  });
});
