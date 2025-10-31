import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import IconEdit from 'components/Icons/IconEdit';
import { IconCode, IconDeviceFloppy } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import TruncatedText from 'components/TruncatedText';
import { updateResponseExampleName, updateResponseExampleDescription } from 'providers/ReduxStore/slices/collections';
import get from 'lodash/get';

const ResponseExampleTopBar = ({
  item,
  collection,
  exampleUid,
  editMode,
  onEditToggle,
  onSave,
  onCancel,
  onGenerateCode
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const example = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid) : get(item, 'examples', []).find((e) => e.uid === exampleUid);
  }, [item.draft, item.examples, item, exampleUid]);

  const handleGenerateCode = () => {
    if (onGenerateCode) {
      onGenerateCode({
        ...example,
        isExample: true,
        exampleUid: exampleUid
      });
    }
  };

  const handleNameChange = (e) => {
    // Validate required fields before dispatching
    if (!item?.uid) {
      console.error('item.uid is missing');
      return;
    }
    if (!collection?.uid) {
      console.error('collection.uid is missing');
      return;
    }
    if (!exampleUid) {
      console.error('exampleUid is missing');
      return;
    }

    dispatch(updateResponseExampleName({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      name: e.target.value
    }));
  };

  const handleDescriptionChange = (e) => {
    // Validate required fields before dispatching
    if (!item?.uid) {
      console.error('item.uid is missing');
      return;
    }
    if (!collection?.uid) {
      console.error('collection.uid is missing');
      return;
    }
    if (!exampleUid) {
      console.error('exampleUid is missing');
      return;
    }

    dispatch(updateResponseExampleDescription({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      description: e.target.value
    }));
  };

  const handleSave = () => {
    // Call the parent save handler
    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (!example || !exampleUid) {
    return null;
  }

  if (editMode) {
    return (
      <StyledWrapper className="p-4">
        <div className="max-w-full">
          <div className="flex items-start justify-between gap-6 md:flex-row flex-col">
            <div className="flex-1 min-w-0">
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={example?.name || ''}
                    onChange={handleNameChange}
                    className="example-input example-input-name"
                    placeholder="Enter example name"
                    autoFocus
                    data-testid="response-example-name-input"
                  />
                </div>
                <div>
                  <textarea
                    value={example?.description || ''}
                    onChange={handleDescriptionChange}
                    className="example-input example-input-description"
                    placeholder="Enter example description"
                    rows={3}
                    data-testid="response-example-description-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
              <button
                className="secondary-btn flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium cursor-pointer border whitespace-nowrap"
                onClick={handleCancel}
                data-testid="response-example-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="primary-btn flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium cursor-pointer border whitespace-nowrap"
                onClick={handleSave}
                data-testid="response-example-save-btn"
              >
                <IconDeviceFloppy size={16} color={theme.examples.buttonText} />
                Save
              </button>
            </div>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  // Default view mode
  return (
    <StyledWrapper className="p-4">
      <div className="max-w-full">
        <div className="flex items-start justify-between gap-6 md:flex-row flex-col">
          <div className="flex-1 min-w-0">
            <h2 className="response-example-title font-semibold mb-2 leading-tight text-base" data-testid="response-example-title">
              {example.name}
            </h2>
            {example.description && example.description.trim().length > 0 && (
              <TruncatedText
                text={example.description}
                maxLines={2}
                className="response-example-description-container"
                textClassName="response-example-description text-sm leading-relaxed max-w-fit"
                buttonClassName="text-blue-600 hover:text-blue-800 font-medium"
                viewMoreText="View More"
                viewLessText="View Less"
                dataTestId="response-example-description"
              />
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
            <button
              className="secondary-btn flex items-center gap-1.5 p-2 rounded-md text-xs font-medium cursor-pointer border whitespace-nowrap"
              onClick={handleGenerateCode}
              title="Generate Code"
              data-testid="response-example-generate-code-btn"
            >
              <IconCode size={16} color={theme.examples.buttonIconColor} />
            </button>
            <button
              className="secondary-btn flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium cursor-pointer border whitespace-nowrap"
              onClick={onEditToggle}
              data-testid="response-example-edit-btn"
            >
              <IconEdit size={16} color={theme.examples.buttonIconColor} />
              Edit Example
            </button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleTopBar;
