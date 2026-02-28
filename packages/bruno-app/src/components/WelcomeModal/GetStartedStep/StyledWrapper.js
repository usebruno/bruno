import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .primary-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .primary-action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 1rem;
    border-radius: ${(props) => props.theme.border.radius.md};
    border: 1px solid ${(props) => props.theme.border.border1};
    background: transparent;
    cursor: pointer;
    text-align: center;
    color: ${(props) => props.theme.text};
    transition: all 0.15s ease;

    &:hover {
      border-color: ${(props) => props.theme.primary.subtle};
      background: ${(props) => rgba(props.theme.primary.solid, 0.06)};
    }

    &:active {
      transform: scale(0.98);
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: ${(props) => props.theme.border.radius.md};
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${(props) => rgba(props.theme.primary.solid, 0.1)};
      color: ${(props) => props.theme.primary.solid};
    }

    .card-title {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .card-desc {
      font-size: 0.75rem;
      color: ${(props) => props.theme.colors.text.subtext0};
      line-height: 1.4;
    }
  }

  .secondary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .secondary-action {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    color: ${(props) => props.theme.text};
    transition: all 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-color: ${(props) => props.theme.border.border1};
    }

    .secondary-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    .secondary-label {
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .secondary-desc {
      font-size: 0.6875rem;
      color: ${(props) => props.theme.colors.text.subtext0};
    }
  }
`;

export default StyledWrapper;
