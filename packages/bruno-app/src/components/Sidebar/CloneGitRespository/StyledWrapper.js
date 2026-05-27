import styled from 'styled-components';
import { IMPORT_COLLECTION_SELECTION_WIDTH } from 'components/SelectionList/constants';

const StyledWrapper = styled.div`
  width: ${IMPORT_COLLECTION_SELECTION_WIDTH};
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  .info-box {
    background-color: ${(props) => props.theme.background.mantle};
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.border.border2};
    padding: 10px;
    border-radius: 5px;
    margin-top: 5px;
    width: 400px;
    white-space: pre-wrap;
    max-height: 150px;
    overflow-y: auto;
  }

  .clone-progress-steps {
    margin-bottom: 0.5rem;
  }
`;

export default StyledWrapper;
