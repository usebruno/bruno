import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  color: ${(props) => props.theme.text};

  label {
    font-size: 0.8125rem;
  }

  table.cache-stats {
    border-collapse: collapse;
    max-width: 16rem;

    td {
      padding: 0.375rem 0;
      font-size: 0.8125rem;

      &.label {
        color: ${(props) => props.theme.colors.text.muted};
        padding-right: 2rem;
      }

      &.value {
        font-weight: 500;
        text-align: right;
      }
    }

    tr:not(:last-child) td {
      border-bottom: 1px solid ${(props) => props.theme.table.border};
    }
  }

  .text-muted {
    font-size: 0.8125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;
