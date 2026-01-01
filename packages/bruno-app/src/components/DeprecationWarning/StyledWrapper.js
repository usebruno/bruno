import styled from 'styled-components';

const StyledWrapper = styled.div`
  .deprecation-warning {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px;
    gap: 4px;
    margin-bottom: 8px;
    background: ${(props) => props.theme.deprecationWarning.bg};
    border: 1px solid ${(props) => props.theme.deprecationWarning.border};
    border-radius: 6px;

    .warning-icon {
      color: ${(props) => props.theme.deprecationWarning.icon};
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }

    .warning-text {
      font-family: 'Inter', sans-serif;
      font-style: normal;
      font-size: 14px;
      line-height: 17px;
      color: ${(props) => props.theme.deprecationWarning.text};

      a {
        color: ${(props) => props.theme.textLink};
        text-decoration: underline;

        &:hover {
          text-decoration: none;
        }
      }
    }
  }
`;

export default StyledWrapper;
