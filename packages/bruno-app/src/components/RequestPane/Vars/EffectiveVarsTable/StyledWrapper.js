import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
      text-align: left;
    }

    th,
    td {
      padding: 6px 10px;
      overflow-wrap: anywhere;
    }
  }

  .empty-state {
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.base};
  }

  .source-tag {
    display: inline-block;
    font-size: 11px;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 4px;
    background: ${(props) => props.theme.background?.surface0 || 'transparent'};
    color: ${(props) => props.theme.colors.text.subtext0};
    border: 1px solid ${(props) => props.theme.table.border};
  }

  .secret-toggle {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export default Wrapper;
