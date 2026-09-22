/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const theme = {
  bg: '#fff',
  draftColor: '#f00',
  requestTabs: { icon: { color: '#333' } }
};

jest.mock('providers/Theme', () => ({
  useTheme: () => ({ displayedTheme: 'light', theme })
}));

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector({ app: { preferences: { font: { codeFont: 'default' } } } })
}));

jest.mock('hooks/useDragResize', () => ({
  useDragResize: () => ({ dragging: false, dragWidth: null, dragbarProps: {} })
}));

jest.mock('./Renderers/Swagger', () => () => <div data-testid="swagger" />);

// Stands in for CodeMirror so the test can read what the editor was handed and fire an edit.
jest.mock('./FileEditor/CodeEditor/index', () => {
  return function MockCodeEditor({ value, readOnly, onEdit }) {
    return (
      <textarea
        data-testid="editor"
        data-readonly={String(readOnly)}
        data-has-onedit={String(typeof onEdit === 'function')}
        value={value}
        onChange={(e) => onEdit && onEdit(e.target.value)}
      />
    );
  };
});

import SpecViewer from './SpecViewer';
import { SPEC_PREVIEW_ERRORS } from './constants';

const SPEC = 'openapi: 3.0.0\ninfo:\n  title: Demo\n  version: "1"\npaths: {}\n';

const editor = () => screen.getByTestId('editor');
const saveIcon = () => document.querySelector('.api-spec-left-pane svg');

describe('SpecViewer', () => {
  describe('what the editor shows', () => {
    it('shows the saved spec when nothing has been edited', () => {
      render(<SpecViewer content={SPEC} onSave={jest.fn()} onDraftChange={jest.fn()} />);

      expect(editor()).toHaveValue(SPEC);
    });

    it('shows the unsaved edit in place of the saved spec', () => {
      render(
        <SpecViewer content={SPEC} draftContent="edited" onSave={jest.fn()} onDraftChange={jest.fn()} />
      );

      expect(editor()).toHaveValue('edited');
    });

    it('shows an empty draft rather than falling back to the saved spec', () => {
      render(<SpecViewer content={SPEC} draftContent="" onSave={jest.fn()} onDraftChange={jest.fn()} />);

      expect(editor()).toHaveValue('');
    });

    it('ignores an unsaved edit when the spec is read only', () => {
      render(<SpecViewer content={SPEC} draftContent="edited" readOnly />);

      expect(editor()).toHaveValue(SPEC);
    });
  });

  describe('editing', () => {
    it('hands every keystroke to the caller, which owns the draft', () => {
      const onDraftChange = jest.fn();
      render(<SpecViewer content={SPEC} onSave={jest.fn()} onDraftChange={onDraftChange} />);

      fireEvent.change(editor(), { target: { value: 'typed' } });

      expect(onDraftChange).toHaveBeenCalledWith('typed');
    });

    it('does not let a read only spec be edited', () => {
      render(<SpecViewer content={SPEC} readOnly onDraftChange={jest.fn()} />);

      expect(editor()).toHaveAttribute('data-readonly', 'nocursor');
      expect(editor()).toHaveAttribute('data-has-onedit', 'false');
    });
  });

  describe('saving', () => {
    it('saves the unsaved edit, not the spec it started from', () => {
      const onSave = jest.fn();
      render(
        <SpecViewer content={SPEC} draftContent="edited" onSave={onSave} onDraftChange={jest.fn()} />
      );

      fireEvent.click(saveIcon());

      expect(onSave).toHaveBeenCalledWith('edited');
    });

    it('marks the save control as active only while there is something to save', () => {
      const { rerender } = render(
        <SpecViewer content={SPEC} onSave={jest.fn()} onDraftChange={jest.fn()} />
      );
      expect(saveIcon()).toHaveClass('opacity-50');

      rerender(
        <SpecViewer content={SPEC} draftContent="edited" onSave={jest.fn()} onDraftChange={jest.fn()} />
      );
      expect(saveIcon()).toHaveClass('opacity-100');
    });

    it('offers no save control on a read only spec', () => {
      render(<SpecViewer content={SPEC} readOnly onSave={jest.fn()} />);

      expect(saveIcon()).toBeNull();
    });
  });

  describe('the preview beside the editor', () => {
    it('renders the spec when it is valid OpenAPI', () => {
      render(<SpecViewer content={SPEC} onSave={jest.fn()} onDraftChange={jest.fn()} />);

      expect(screen.getByTestId('swagger')).toBeInTheDocument();
    });

    it('explains itself instead of rendering when the spec cannot be parsed', () => {
      render(<SpecViewer content={'a: b:\n  - ['} onSave={jest.fn()} onDraftChange={jest.fn()} />);

      expect(screen.queryByTestId('swagger')).toBeNull();
      expect(screen.getByText(SPEC_PREVIEW_ERRORS.INVALID_YAML_JSON)).toBeInTheDocument();
    });

    it('explains itself when the file parses but is not an OpenAPI document', () => {
      render(<SpecViewer content={'name: not-a-spec\n'} onSave={jest.fn()} onDraftChange={jest.fn()} />);

      expect(screen.queryByTestId('swagger')).toBeNull();
      expect(screen.getByText(SPEC_PREVIEW_ERRORS.INVALID_OPENAPI)).toBeInTheDocument();
    });
  });
});
