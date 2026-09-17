import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .migration-section {
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }

  .icon-box.migration {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.08)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.09)};

    svg {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }
`;

export default StyledWrapper;
