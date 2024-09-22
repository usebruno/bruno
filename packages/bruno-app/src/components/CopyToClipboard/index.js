import { IconCopy } from '@tabler/icons';
import toast from 'react-hot-toast';
import { CopyToClipboard as CopyToClipboardBase } from 'react-copy-to-clipboard';
import StyledWrapper from './StyledWrapper';

/**
 * A button to copy text to clipboard
 *
 * @param {Object} props The component props
 * @param {string} props.copy The text to copy when clicked
 */
const CopyToClipboard = ({ copy, ...props }) => (
  <StyledWrapper {...props}>
    <CopyToClipboardBase className="copy-to-clipboard" text={copy} onCopy={() => toast.success('Copied to clipboard!')}>
      <IconCopy size={25} strokeWidth={1.5} />
    </CopyToClipboardBase>
  </StyledWrapper>
);

export default CopyToClipboard;
