import styled from 'styled-components';

const StyledWrapper = styled.div`
  .commandk-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.15rem 0.3rem;
    border: 1px solid ${(props) => props.theme.colors.text.yellow};
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
    
    &:hover {
      opacity: 0.8;
    }
  }
  .keycap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 1px solid ${(props) => props.theme.modal.input.border};
    border-radius: 4px;
    background: ${(props) =>
      props.theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
    font-size: 0.65rem;
    line-height: 1rem;
  }
`;

export default StyledWrapper;