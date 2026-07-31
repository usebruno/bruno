import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditableTable from './index';

jest.mock('react-virtuoso', () => ({
  TableVirtuoso: ({ data, fixedHeaderContent, itemContent }) => (
    <table>
      <thead>{fixedHeaderContent()}</thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={row.uid}>{itemContent(index, row)}</tr>
        ))}
      </tbody>
    </table>
  )
}));

jest.mock('./StyledWrapper', () => {
  const { forwardRef } = jest.requireActual('react');

  return forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
});

const columns = [
  {
    key: 'name',
    name: 'Name'
  }
];

const ControlledTable = ({ initialRows }) => {
  const [rows, setRows] = useState(initialRows);

  return (
    <div style={{ overflowY: 'auto' }}>
      <EditableTable
        tableId="query-params"
        columns={columns}
        rows={rows}
        onChange={setRows}
        defaultRow={{ name: '' }}
        showSelectAll
        checkboxLabel="Toggle all query parameters"
        showAddRow={false}
        showDelete={false}
      />
    </div>
  );
};

describe('EditableTable select all checkbox', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('shows an indeterminate state and enables every row when clicked', async () => {
    render(
      <ControlledTable
        initialRows={[
          { uid: 'first', name: 'First', enabled: true },
          { uid: 'second', name: 'Second', enabled: false }
        ]}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: 'Toggle all query parameters'
    });

    expect(selectAllCheckbox).toBePartiallyChecked();

    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).toBeChecked();
    screen.getAllByTestId('column-checkbox').forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('disables every row when all rows are enabled', async () => {
    render(
      <ControlledTable
        initialRows={[
          { uid: 'first', name: 'First', enabled: true },
          { uid: 'second', name: 'Second', enabled: true }
        ]}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: 'Toggle all query parameters'
    });

    await user.click(selectAllCheckbox);

    expect(selectAllCheckbox).not.toBeChecked();
    screen.getAllByTestId('column-checkbox').forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('disables the select all checkbox when there are no rows', () => {
    render(<ControlledTable initialRows={[]} />);

    expect(screen.getByRole('checkbox', {
      name: 'Toggle all query parameters'
    })).toBeDisabled();
  });
});
