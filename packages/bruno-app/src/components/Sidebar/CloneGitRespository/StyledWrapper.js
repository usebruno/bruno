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

  .clone-step-error-icon {
    color: ${(props) => props.theme.status.danger.text};
  }

  .clone-step-progress-icon {
    color: ${(props) => props.theme.status.warning.text};
  }

  .scan-warning {
    color: ${(props) => props.theme.status.warning.text};
    background-color: ${(props) => props.theme.status.warning.background};
    border: 1px solid ${(props) => props.theme.status.warning.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.375rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
  }

  .scan-warning-icon {
    color: ${(props) => props.theme.status.warning.text};
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
