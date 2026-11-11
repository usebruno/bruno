import styled from 'styled-components';
import iconButtonStyles from '../IconButtonStyles';
import iconInputStyles from '../IconInputStyles';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .collection-picker-search {
    ${iconInputStyles}
    flex: none;
    margin: 0.25rem 1.25rem 0.875rem;
  }

  .collection-picker-search-clear {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1.375rem;
    height: 1.375rem;
    ${iconButtonStyles}
  }

  .collection-picker-summary {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.625rem;
    padding: 0 1.25rem 0.625rem;
    font-size: 0.78125rem;
    color: ${(props) => props.theme.colors.text.muted};

    strong {
      min-width: 0;
      margin-right: 0.625rem;
      font-weight: 500;
      color: ${(props) => props.theme.text};
      overflow-wrap: anywhere;
    }
  }

  .collection-picker-list {
    flex: 1;
    min-height: 0;
    margin: 0 1.25rem 1.25rem;
    overflow: hidden;
    border: 0.0625rem solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    background: ${(props) => props.theme.bg};
  }

  .collection-picker-item:not(.is-last) {
    border-bottom: 0.0625rem solid ${(props) => props.theme.border.border0};
  }

  .collection-picker-no-match {
    max-width: 28rem;
    margin: 0 auto;
    padding: 2.75rem 1.5rem;
    font-size: 0.78125rem;
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
    text-align: center;
  }

  .collection-picker-footer {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 0.0625rem solid ${(props) => props.theme.border.border1};
  }

  .collection-picker-footer-start {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.78125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .collection-picker-actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

export default StyledWrapper;
