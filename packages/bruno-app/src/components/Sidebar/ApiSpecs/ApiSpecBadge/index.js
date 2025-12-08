import { IconFileCode } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const ApiSpecsBadge = () => {
  return (
    <StyledWrapper>
      <div className="items-center mt-2 relative">
        <div className="api-specs-badge flex items-center justify-between px-2">
          <div className="flex items-center py-1 select-none">
            <span className="mr-2">
              <IconFileCode size={18} strokeWidth={1.5} />
            </span>
            <span>APIs</span>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ApiSpecsBadge;
