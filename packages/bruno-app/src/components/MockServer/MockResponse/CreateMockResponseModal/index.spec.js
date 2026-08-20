import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CreateMockResponseModal from './index';

jest.mock('components/Portal', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="portal-root">{children}</div>
}));

jest.mock('components/Modal', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="mock-modal">
      {props.children}
      <button
        data-testid="create-mock-response-modal-submit-btn"
        disabled={props.confirmDisabled}
        onClick={props.handleConfirm}
      >
        {props.confirmText}
      </button>
    </div>
  )
}));

const collectionWithExample = {
  uid: 'collection-1',
  items: [
    {
      uid: 'item-1',
      name: 'Get user',
      type: 'http-request',
      examples: [
        {
          uid: 'example-1',
          name: 'User found',
          response: { status: 201, body: { type: 'xml' } }
        }
      ]
    }
  ]
};

const renderModal = ({
  collection = null,
  existingResponses = [],
  onCreate = jest.fn(),
  onClose = jest.fn()
} = {}) => {
  const utils = render(
    <CreateMockResponseModal
      collection={collection}
      existingResponses={existingResponses}
      onCreate={onCreate}
      onClose={onClose}
    />
  );

  return { ...utils, onCreate, onClose };
};

const nameInput = () => screen.getByTestId('mock-response-create-name-input');
const submitBtn = () => screen.getByTestId('create-mock-response-modal-submit-btn');
const typeName = (value) => fireEvent.change(nameInput(), { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreateMockResponseModal', () => {
  it('blocks Create on open, while the name is still empty', async () => {
    renderModal();
    await waitFor(() => expect(submitBtn()).toBeDisabled());
  });

  it('stays quiet about the empty name until the field is touched', async () => {
    renderModal();
    await act(async () => {});
    expect(screen.queryByText('Name cannot be empty.')).not.toBeInTheDocument();

    fireEvent.blur(nameInput());
    await waitFor(() => expect(screen.getByText('Name cannot be empty.')).toBeInTheDocument());
  });

  it('blocks Create and shows the shared naming error for a disallowed character', async () => {
    renderModal();

    typeName('bad/name');
    fireEvent.blur(nameInput());

    await waitFor(() => expect(
      screen.getByText('Special characters aren\'t allowed in the name. Invalid character \'/\'.')
    ).toBeInTheDocument());
    expect(submitBtn()).toBeDisabled();
  });

  it('blocks Create for a name over 255 characters', async () => {
    renderModal();

    typeName('a'.repeat(256));
    fireEvent.blur(nameInput());

    await waitFor(() => expect(screen.getByText('Name cannot exceed 255 characters.')).toBeInTheDocument());
    expect(submitBtn()).toBeDisabled();
  });

  it('blocks Create for a name already used by another response', async () => {
    renderModal({ existingResponses: [{ uid: 'r-1', name: 'Success' }] });

    typeName('  success  ');
    fireEvent.blur(nameInput());

    await waitFor(() => expect(
      screen.getByText('A mock response with this name already exists')
    ).toBeInTheDocument());
    expect(submitBtn()).toBeDisabled();
  });

  it('creates with a trimmed name and closes', async () => {
    const onCreate = jest.fn().mockResolvedValue();
    const { onClose } = renderModal({ onCreate });

    typeName('  Order 200  ');
    await waitFor(() => expect(submitBtn()).toBeEnabled());
    fireEvent.click(submitBtn());

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      name: 'Order 200',
      description: '',
      statusCode: 200,
      bodyType: 'json',
      exampleSelection: null
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('accepts names the shared Bruno rules allow', async () => {
    const onCreate = jest.fn().mockResolvedValue();
    renderModal({ onCreate });

    typeName('404');
    await waitFor(() => expect(submitBtn()).toBeEnabled());
  });

  describe('copying from a collection example', () => {
    const useExampleCheckbox = () => screen.getByTestId('mock-response-use-example-checkbox');

    it('explains why Create is blocked as soon as copy-from-example is ticked', async () => {
      renderModal({ collection: collectionWithExample });

      typeName('From example');
      await waitFor(() => expect(submitBtn()).toBeEnabled());

      fireEvent.click(useExampleCheckbox());

      await waitFor(() => expect(screen.getByText('Select a collection example')).toBeInTheDocument());
      expect(submitBtn()).toBeDisabled();
    });

    it('fills the name, status and body type from the chosen example', async () => {
      const onCreate = jest.fn().mockResolvedValue();
      renderModal({ collection: collectionWithExample, onCreate });

      fireEvent.click(useExampleCheckbox());
      fireEvent.change(screen.getByTestId('mock-response-example-select'), {
        target: { value: 'item-1:example-1' }
      });

      await waitFor(() => expect(nameInput()).toHaveValue('User found'));
      await act(async () => {});
      expect(submitBtn()).toBeEnabled();
      fireEvent.click(submitBtn());

      await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'User found',
        statusCode: 201,
        bodyType: 'xml'
      })));
    });

    it('still validates the name that came from the example', async () => {
      renderModal({
        collection: collectionWithExample,
        existingResponses: [{ uid: 'r-1', name: 'User found' }]
      });

      fireEvent.click(useExampleCheckbox());
      fireEvent.change(screen.getByTestId('mock-response-example-select'), {
        target: { value: 'item-1:example-1' }
      });
      fireEvent.blur(nameInput());

      await waitFor(() => expect(
        screen.getByText('A mock response with this name already exists')
      ).toBeInTheDocument());
      expect(submitBtn()).toBeDisabled();
    });
  });

  it('surfaces a rejected create under the name field and keeps the modal open', async () => {
    const onCreate = jest.fn().mockRejectedValue(new Error('A mock response with this name already exists'));
    const { onClose } = renderModal({ onCreate });

    typeName('Taken');
    await waitFor(() => expect(submitBtn()).toBeEnabled());
    fireEvent.click(submitBtn());

    await waitFor(() => expect(
      screen.getByText('A mock response with this name already exists')
    ).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });
});
