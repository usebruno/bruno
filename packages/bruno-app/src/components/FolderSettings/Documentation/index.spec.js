import React from 'react';
import os from 'os';
import path from 'path';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';

jest.mock('components/CodeEditor', () => () => null);
jest.mock('providers/Theme', () => ({ useTheme: () => ({ displayedTheme: 'light' }) }));
jest.mock('react-redux', () => ({ useDispatch: () => jest.fn(), useSelector: () => ({}) }));

import Documentation from './index';

const mockTheme = themes.light;
const collectionPath = path.join(os.tmpdir(), 'bruno-test-collection');

const renderWithTheme = (props) => render(
  <ThemeProvider theme={mockTheme}>
    <Documentation {...props} />
  </ThemeProvider>
);

describe('FolderSettings Documentation — folder can be falsy', () => {
  it('renders nothing instead of crashing when folder is undefined', () => {
    const { container } = renderWithTheme({ collection: { uid: 'c1', pathname: collectionPath }, folder: undefined });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders normally once folder is present', () => {
    const folder = { uid: 'f1', draft: null, root: { docs: 'hello' } };
    const { container } = renderWithTheme({ collection: { uid: 'c1', pathname: collectionPath }, folder });

    expect(container.firstChild).not.toBeNull();
  });
});
