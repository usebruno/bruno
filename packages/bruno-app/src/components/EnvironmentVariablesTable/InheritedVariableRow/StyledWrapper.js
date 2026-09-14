import styled, { css } from 'styled-components';

/* Virtuoso renders the row element, so each cell is styled on its own rather than under one wrapper. */

const readOnlyText = css`
  font-style: italic;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const EnabledCell = styled.td`
  input[type='checkbox']:disabled {
    cursor: not-allowed;
  }
`;

export const NameCell = styled.td`
  .inherited-name {
    ${readOnlyText}
  }
`;

export const ValueCell = styled.td`
  .inherited-value-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inherited-value {
    ${readOnlyText}
    flex: 1 1 0;
    min-width: 0;
  }

  .inherited-data-type {
    flex-shrink: 0;
    padding-right: 18px;
  }
`;

export const DescriptionCell = styled.td`
  .inherited-description {
    ${readOnlyText}
  }
`;

export const SourceCell = styled.td`
  .inherited-source {
    display: inline-flex;
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }
  }
`;
