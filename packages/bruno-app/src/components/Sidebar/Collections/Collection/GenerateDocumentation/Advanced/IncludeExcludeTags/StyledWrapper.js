import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tags-columns {
    display: flex;
    gap: 1rem;
    width: 100%;
    min-width: 0;
  }

  .tags-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .tags-label {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    line-height: 1.25rem;
    color: ${(props) => props.theme.colors.text.subtext2};
  }
`;

export default StyledWrapper;
