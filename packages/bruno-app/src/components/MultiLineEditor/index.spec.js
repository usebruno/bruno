import MultiLineEditor from './index';
import { getAllVariables } from 'utils/collections';

jest.mock('codemirror', () => jest.fn());

jest.mock('utils/collections', () => ({
  getAllVariables: jest.fn()
}));

jest.mock('utils/common/codemirror', () => ({
  defineCodeMirrorBrunoVariablesMode: jest.fn()
}));

jest.mock('utils/codemirror/autocomplete', () => ({
  setupAutoComplete: jest.fn()
}));

jest.mock('utils/common/masked-editor', () => ({
  MaskedEditor: jest.fn()
}));

jest.mock('utils/codemirror/linkAware', () => ({
  setupLinkAware: jest.fn()
}));

describe('MultiLineEditor', () => {
  it('updates collection variable info without traversing collection items', () => {
    const createCollection = () => {
      const getItems = jest.fn(() => []);
      const collection = { uid: 'collection-1' };
      Object.defineProperty(collection, 'items', {
        enumerable: true,
        get: getItems
      });
      return { collection, getItems };
    };

    const previous = createCollection();
    const current = createCollection();
    const variables = { baseUrl: 'https://example.com' };
    const previousProps = {
      collection: previous.collection,
      value: '',
      theme: 'light',
      isSecret: false,
      readOnly: false,
      placeholder: ''
    };
    const editor = new MultiLineEditor(previousProps);

    editor.variables = variables;
    editor.editor = {
      options: {
        brunoVarInfo: {
          collection: previous.collection,
          item: undefined,
          variables
        }
      },
      setOption: jest.fn()
    };
    editor.props = {
      ...previousProps,
      collection: current.collection
    };
    getAllVariables.mockReturnValue(variables);

    editor.componentDidUpdate(previousProps);

    expect(editor.editor.options.brunoVarInfo.collection).toBe(current.collection);
    expect(previous.getItems).not.toHaveBeenCalled();
    expect(current.getItems).not.toHaveBeenCalled();
  });
});
