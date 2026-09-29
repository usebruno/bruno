import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { openApiSpecTab } from 'providers/ReduxStore/slices/apiSpec';
import { showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import ApiSpecItem from './index';

jest.mock('react-redux', () => ({ useDispatch: jest.fn(), useSelector: jest.fn() }));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() }
}));

jest.mock('providers/ReduxStore/slices/apiSpec', () => ({
  openApiSpecTab: jest.fn((apiSpec) => ({ type: 'test/openApiSpecTab', apiSpec }))
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  showInFolder: jest.fn()
}));

jest.mock('components/Sidebar/SidebarAccordionContext', () => ({
  useSidebarAccordion: () => ({ dropdownContainerRef: { current: null } })
}));

jest.mock('utils/common/platform', () => ({ getRevealInFolderLabel: () => 'Reveal in Finder' }));

const mockToggleMenu = jest.fn();
jest.mock('ui/MenuDropdown', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return forwardRef(({ items }, ref) => {
    useImperativeHandle(ref, () => ({ toggle: mockToggleMenu }));
    return (
      <div>
        {items.filter((item) => item.type !== 'divider').map((item) => (
          <button key={item.id} type="button" onClick={item.onClick}>{item.id}</button>
        ))}
      </div>
    );
  });
});

jest.mock('ui/ActionIcon', () => ({ children }) => <span>{children}</span>);
jest.mock('components/Sidebar/ApiSpecs/RemoveApiSpec', () => () => <div data-testid="remove-dialog" />);
jest.mock('components/Sidebar/ApiSpecs/DeleteApiSpec', () => () => <div data-testid="delete-dialog" />);
jest.mock('components/Sidebar/ApiSpecs/GenerateCollectionFromSpec', () => () => <div data-testid="generate-collection-step" />);
jest.mock('components/MockServer/CreateMockServerModal', () => ({ defaultSourceType, defaultApiSpecUid }) => (
  <div data-testid="mock-server-modal">{`${defaultSourceType}:${defaultApiSpecUid}`}</div>
));

const OPENAPI_SPEC = {
  uid: 'spec-1',
  name: 'Petstore',
  pathname: '/workspace/specs/petstore.yaml',
  json: { openapi: '3.0.0', info: { title: 'Petstore' } }
};

const NOT_AN_API = {
  uid: 'spec-2',
  name: 'notes',
  pathname: '/workspace/specs/notes.yaml',
  json: { title: 'Not an API' }
};

const renderRow = (apiSpec, { mockServerBeta = true } = {}) => {
  const state = {
    tabs: { tabs: [], activeTabUid: null },
    app: { preferences: { beta: { 'mock-server': mockServerBeta } } }
  };
  useSelector.mockImplementation((selector) => selector(state));
  return render(<ApiSpecItem apiSpec={apiSpec} />);
};

describe('ApiSpecItem', () => {
  let dispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn((action) => action);
    useDispatch.mockReturnValue(dispatch);
    showInFolder.mockReturnValue(Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the actions menu on right-click', () => {
    renderRow(OPENAPI_SPEC);

    const defaultAllowed = fireEvent.contextMenu(screen.getByText(OPENAPI_SPEC.name));

    expect(defaultAllowed).toBe(false);
    expect(mockToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('leaves the open menu alone when one of its items is right-clicked', () => {
    renderRow(OPENAPI_SPEC);

    fireEvent.contextMenu(screen.getByText('reveal'));

    expect(mockToggleMenu).not.toHaveBeenCalled();
  });

  it('opens the spec tab with Enter on the focused row', () => {
    renderRow(OPENAPI_SPEC);

    fireEvent.keyDown(screen.getByTestId('sidebar-api-spec-row'), { key: 'Enter' });

    expect(openApiSpecTab).toHaveBeenCalledWith(OPENAPI_SPEC);
  });

  it('opens the import step for an OpenAPI document', () => {
    renderRow(OPENAPI_SPEC);

    fireEvent.click(screen.getByText('generate-collection'));

    expect(screen.getByTestId('generate-collection-step')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports a file that is not an OpenAPI document instead of opening the import step', () => {
    renderRow(NOT_AN_API);

    fireEvent.click(screen.getByText('generate-collection'));

    expect(toast.error).toHaveBeenCalledWith('This file is not a valid OpenAPI 3.x or Swagger 2.0 document');
    expect(screen.queryByTestId('generate-collection-step')).not.toBeInTheDocument();
  });

  it('opens the mock server modal on the spec source with this spec', () => {
    renderRow(OPENAPI_SPEC);

    fireEvent.click(screen.getByText('generate-mock-server'));

    expect(screen.getByTestId('mock-server-modal')).toHaveTextContent('spec:spec-1');
  });

  it('offers no mock server action when the beta flag is off', () => {
    renderRow(OPENAPI_SPEC, { mockServerBeta: false });

    expect(screen.queryByText('generate-mock-server')).not.toBeInTheDocument();
  });

  it('reveals the spec file in its folder', () => {
    renderRow(OPENAPI_SPEC);

    fireEvent.click(screen.getByText('reveal'));

    expect(showInFolder).toHaveBeenCalledWith(OPENAPI_SPEC.pathname);
  });

  it('reveals the spec under a path in normal form', () => {
    renderRow({ ...OPENAPI_SPEC, pathname: '/workspace/specs/./petstore.yaml' });

    fireEvent.click(screen.getByText('reveal'));

    expect(showInFolder).toHaveBeenCalledWith('/workspace/specs/petstore.yaml');
  });

  it('reports when the spec file cannot be revealed', async () => {
    showInFolder.mockReturnValue(Promise.reject(new Error('not found')));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderRow(OPENAPI_SPEC);

    fireEvent.click(screen.getByText('reveal'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error revealing the API spec'));
  });

  it.each([
    ['remove', 'remove-dialog'],
    ['delete', 'delete-dialog']
  ])('%s opens its confirmation dialog', (actionId, dialogTestId) => {
    renderRow(OPENAPI_SPEC);

    fireEvent.click(screen.getByText(actionId));

    expect(screen.getByTestId(dialogTestId)).toBeInTheDocument();
  });
});
