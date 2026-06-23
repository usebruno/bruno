import styled from 'styled-components';

const StyledWrapper = styled.div`
  .rules-panel {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px;
    margin-top: 12px;
  }

  .rule-row {
    display: grid;
    grid-template-columns: 110px 110px 1fr 120px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .rule-row select,
  .rule-row input {
    width: 100%;
    min-width: 0;
  }
`;

export default StyledWrapper;
