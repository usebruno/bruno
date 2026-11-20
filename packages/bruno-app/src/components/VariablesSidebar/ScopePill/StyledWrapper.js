import styled from 'styled-components';

const StyledWrapper = styled.span`
  flex-shrink: 1;
  min-width: 0;
  max-width: 140px;
  padding: 0 7px;
  border: 1px solid ${(props) => props.theme.border.border2};
  border-radius: 999px;
  color: ${(props) => props.theme.colors.text.muted};
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default StyledWrapper;
