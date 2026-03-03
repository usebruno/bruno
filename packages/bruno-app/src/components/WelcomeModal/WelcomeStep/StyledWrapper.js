import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .highlights {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .highlight-item {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;

    .highlight-icon {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: ${(props) => props.theme.border.radius.base};
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${(props) => rgba(props.theme.primary.solid, 0.1)};
      color: ${(props) => props.theme.primary.solid};
      margin-top: 1px;
    }

    .highlight-title {
      font-weight: 600;
      font-size: 0.8125rem;
      color: ${(props) => props.theme.text};
      margin-bottom: 0.125rem;
    }

    .highlight-desc {
      font-size: 0.75rem;
      color: ${(props) => props.theme.colors.text.subtext1};
      line-height: 1.45;
    }
  }
`;

export default StyledWrapper;
