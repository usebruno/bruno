import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveWorkspaceDocs } from 'providers/ReduxStore/slices/workspaces/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconFileText, IconEdit, IconX } from '@tabler/icons';
import Button from 'ui/Button';
import toast from 'react-hot-toast';
import ActionIcon from 'ui/ActionIcon/index';

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

  const handleAddDocumentation = () => {
    setIsEditing(true);
  };

  const hasDocs = localDocs && localDocs.trim().length > 0;

  return (
    <StyledWrapper className="h-full w-full flex flex-col">
      <div className="docs-header">
        <div className="docs-title">
          <IconFileText size={16} strokeWidth={1.5} />
          <span>Documentation</span>
        </div>
        {hasDocs && !isEditing && (
          <ActionIcon className="edit-btn" onClick={toggleViewMode}>
            <IconEdit size={16} strokeWidth={1.5} />
          </ActionIcon>
        )}
        {isEditing && (
          <ActionIcon className="edit-btn" onClick={handleDiscardChanges}>
            <IconX size={16} strokeWidth={1.5} />
          </ActionIcon>
        )}
      </div>

      <div className="docs-content">
        {isEditing ? (
          <div className="editor-container">
            <CodeEditor
              theme={displayedTheme}
              value={localDocs}
              onEdit={onEdit}
              onSave={onSave}
              mode="markdown"
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
            />
            <div className="editor-actions">
              <Button onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
        ) : hasDocs ? (
          <div className="docs-markdown">
            <Markdown collectionPath={workspace?.pathname || ''} onDoubleClick={toggleViewMode} content={localDocs} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <IconFileText size={28} strokeWidth={1} />
            </div>
            <p className="empty-text">
              Add documentation to help your team work smoothly.
            </p>
            <p className="empty-subtext">You can include:</p>
            <ul className="suggestions-list">
              <li>Project overview</li>
              <li>Setup instructions</li>
              <li>Key workflows</li>
              <li>Resources & FAQs</li>
            </ul>
            <Button color="secondary" size="md" onClick={handleAddDocumentation}>
              Add Documentation
            </Button>
          </div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceDocs;
