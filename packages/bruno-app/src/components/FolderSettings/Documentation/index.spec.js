import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';

jest.mock('components/CodeEditor', () => () => null);
jest.mock('providers/Theme', () => ({ useTheme: () => ({ displayedTheme: 'light' }) }));
jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(), useSelector: () => ({}) }));

import Documentation from './index';

const mockTheme = themes.light;

const renderWithTheme = (props) => render(
  <ThemeProvider theme={mockTheme}>
    <Documentation {...props} />
  </ThemeProvider>
);

describe('FolderSettings Documentation — folder can be falsy', () => {
  it('renders nothing instead of crashing when folder is undefined', () => {
    expect(() => renderWithTheme({ collection: { uid: 'c1', pathname: '/tmp' }, folder: undefined })).not.toThrow();
  });

  it('renders normally once folder is present', () => {
    const folder = { uid: 'f1', draft: null, root: { docs: 'hello' } };
    const { container } = renderWithTheme({ collection: { uid: 'c1', pathname: '/tmp' }, folder });

    expect(container.firstChild).not.toBeNull();
  });
});
