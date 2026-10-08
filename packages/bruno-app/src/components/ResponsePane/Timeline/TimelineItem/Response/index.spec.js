import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { MAX_RENDERABLE_RESPONSE_BYTES } from 'utils/common/constants';
import { ThemeContext } from 'providers/Theme';
import BodyBlock from '../Common/Body/index';
import Response from './index';

jest.mock('../Common/Body/index', () => jest.fn(() => null));
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

  it('marks a body over the renderable limit as not loaded', () => {
    renderResponse({ response: { status: 200, data: null, dataBuffer: null, size: MAX_RENDERABLE_RESPONSE_BYTES + 1 } });

    expect(bodyProps().isLoaded).toBe(true);
  });

  it('treats a small empty body as empty', () => {
    renderResponse({ response: { status: 204, data: null, dataBuffer: null, size: 0 } });

    expect(bodyProps().isLoaded).toBe(false);
  });
});
