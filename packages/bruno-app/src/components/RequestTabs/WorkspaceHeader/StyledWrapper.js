import styled from 'styled-components';

const StyledWrapper = styled.div`
  .workspace-title {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 24px;
    font-size: 15px;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .workspace-name {
    font-size: 15px;
    font-weight: 600;
  }
`;

export default StyledWrapper;
