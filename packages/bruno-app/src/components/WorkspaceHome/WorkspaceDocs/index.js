import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveWorkspaceDocs } from 'providers/ReduxStore/slices/workspaces/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconX, IconFileText } from '@tabler/icons';
import toast from 'react-hot-toast';

const WorkspaceDocs = ({ workspace }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [localDocs, setLocalDocs] = useState(workspace?.docs || '');
  const preferences = useSelector((state) => state.app.preferences);

  useEffect(() => {
    setLocalDocs(workspace?.docs || '');
    setIsEditing(false);
  }, [workspace?.uid, workspace?.docs]);

  const toggleViewMode = () => {
    setIsEditing((prev) => !prev);
  };

  const onEdit = (value) => {
    setLocalDocs(value);
  };

  const handleDiscardChanges = () => {
    setLocalDocs(workspace?.docs || '');
    toggleViewMode();
  };

  const onSave = async () => {
    if (!workspace) {
      toast.error('Workspace not found');
      return;
    }

    try {
      await dispatch(saveWorkspaceDocs(workspace.uid, localDocs));
      toast.success('Documentation saved successfully');
      toggleViewMode();
    } catch (error) {
      console.error('Error saving workspace docs:', error);
      toast.error('Failed to save documentation');
    }
  };

  return (
    <StyledWrapper className="h-full w-full relative flex flex-col p-4">
      <div className="flex flex-row w-full justify-between items-center mb-4">
        <div className="text-lg font-medium flex items-center gap-2">
          <IconFileText size={20} strokeWidth={1.5} />
          Workspace Documentation
        </div>
        <div className="flex flex-row gap-2 items-center justify-center">
          {isEditing ? (
            <>
              <div className="editing-mode" role="tab" onClick={handleDiscardChanges}>
                <IconX className="cursor-pointer" size={20} strokeWidth={1.5} />
              </div>
              <button type="submit" className="submit btn btn-sm btn-secondary" onClick={onSave}>
                Save
              </button>
            </>
          ) : (
            <div className="editing-mode" role="tab" onClick={toggleViewMode}>
              <IconEdit className="cursor-pointer" size={20} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <CodeEditor
          theme={displayedTheme}
          value={localDocs}
          onEdit={onEdit}
          onSave={onSave}
          mode="markdown"
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
        />
      ) : (
        <div className="h-full overflow-auto pl-1">
          <div className="h-[1px] min-h-[500px]">
            {
              localDocs?.length > 0
                ? <Markdown onDoubleClick={toggleViewMode} content={localDocs} />
                : <Markdown onDoubleClick={toggleViewMode} content={workspaceDocumentationPlaceholder} />
            }
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default WorkspaceDocs;

const workspaceDocumentationPlaceholder = `
# Welcome to your Workspace Documentation

This is your workspace documentation area where you can document your entire project, team guidelines, and shared resources.

## What to Document Here

### Project Overview
- Project goals and objectives
- Architecture overview
- Key stakeholders and team members
- Project timeline and milestones

### Development Guidelines
- Coding standards and conventions
- Git workflow and branching strategy
- Code review process
- Testing guidelines

### API Documentation
- Authentication methods
- Base URLs and environments
- Common headers and parameters
- Error handling standards

### Team Resources
- Useful links and references
- Development environment setup
- Deployment procedures
- Troubleshooting guides

## Markdown Support

This documentation supports full Markdown formatting:

- **Bold** and *italic* text
- \`inline code\` and code blocks
- Lists and tables
- [Links](https://usebruno.com) and images
- Headers and sections

**Tip:** Double-click anywhere in this area to start editing!
`;
