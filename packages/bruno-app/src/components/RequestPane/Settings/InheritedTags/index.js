import { IconTag } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import StyledWrapper from './StyledWrapper';

// tags: [{ tag, folderName }] resolved from the request's ancestor folders
const InheritedTags = ({ itemUid, tags = [] }) => {
  return (
    <StyledWrapper className="flex flex-col" data-testid="inherited-tags">
      {tags.length ? (
        <ul className="flex flex-wrap gap-1">
          {tags.map(({ tag, folderName }, index) => (
            <li key={tag}>
              <ToolHint toolhintId={`inherited-tag-${itemUid}-${index}`} text={`Inherited from folder "${folderName}"`}>
                <span className="tag-item">
                  <IconTag size={12} className="tag-icon" aria-hidden="true" />
                  <span className="tag-text">{tag}</span>
                </span>
              </ToolHint>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-xs empty-text">No inherited tags</span>
      )}
    </StyledWrapper>
  );
};

export default InheritedTags;
