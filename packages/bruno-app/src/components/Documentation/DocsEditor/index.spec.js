import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';

jest.mock('components/CodeEditor', () => () => null);
jest.mock('providers/Theme', () => ({ useTheme: () => ({ displayedTheme: 'light' }) }));
jest.mock('react-redux', () => ({ useSelector: () => ({}) }));

import DocsEditor from './index';

const mockTheme = themes.light;

// Mirrors WorkspaceDocs/FolderSettings' Documentation: onSave is a fresh
// closure every render, reading the parent's current docs state; onEdit is
// what DocsEditor's onUpdate calls on doc changes.
const Harness = ({ onSaveSpy }) => {
  const [localDocs, setLocalDocs] = useState('original content');

  return (
    <ThemeProvider theme={mockTheme}>
      <button onClick={() => setLocalDocs('EDITED content')}>simulate-edit</button>
      <DocsEditor
        docs={localDocs}
        onEdit={setLocalDocs}
        onSave={() => onSaveSpy(localDocs)}
        isEditing
        collectionPath=""
        testId="docs-editor"
      />
    </ThemeProvider>
  );
};

describe('DocsEditor — Ctrl+S save freshness', () => {
  it('saves the latest edited content on Ctrl+S, not a stale closure from an earlier render', () => {
    const onSaveSpy = jest.fn();
    const { container, getByText } = render(<Harness onSaveSpy={onSaveSpy} />);

    // Re-renders the parent (and DocsEditor, via new props) with fresh docs/onSave,
    // WITHOUT changing useEditor's only dep (collectionPath).
    act(() => { getByText('simulate-edit').click(); });

    const proseMirror = container.querySelector('.ProseMirror');
    act(() => {
      proseMirror.dispatchEvent(new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      }));
    });

    expect(onSaveSpy).toHaveBeenCalledWith('EDITED content');
    expect(onSaveSpy).not.toHaveBeenCalledWith('original content');
  });
});
