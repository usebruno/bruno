import styled from 'styled-components';

const SelectionFooter = styled.div`
  color: ${(props) => props.theme.colors.text.subtext2};
  font-size: ${(props) => props.theme.font.size.base};
  font-weight: 500;
  line-height: 1.25rem;

  span {
    color: ${(props) => props.theme.primary.solid};
  }
`;

export default SelectionFooter;
