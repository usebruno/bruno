import styled from 'styled-components';
import { IMPORT_COLLECTION_SELECTION_WIDTH } from 'components/SelectionList/constants';

const StyledWrapper = styled.div`
  width: ${IMPORT_COLLECTION_SELECTION_WIDTH};
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
`;

export default StyledWrapper;
