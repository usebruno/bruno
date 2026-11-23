import { IconAlertTriangle } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

export const hasContentLengthWithTransferEncoding = (responseHeaders) => {
  const headerNames = Object.keys(responseHeaders || {}).map((name) => name.toLowerCase());
  return headerNames.includes('content-length') && headerNames.includes('transfer-encoding');
};

const ContentLengthWithTransferEncodingWarning = () => (
  <StyledWrapper data-testid="content-length-with-transfer-encoding-warning">
    <IconAlertTriangle className="warning-icon" size={16} strokeWidth={2} />
    <div className="warning-message">
      Response has both Content-Length and Transfer-Encoding headers. The body was read using Transfer-Encoding and Content-Length was ignored.
    </div>
  </StyledWrapper>
);

export default ContentLengthWithTransferEncodingWarning;
