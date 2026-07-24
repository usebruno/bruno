import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import IconEdit from 'components/Icons/IconEdit';
import { IconDeviceFloppy } from '@tabler/icons';
import StyledWrapper from 'components/ResponseExample/ResponseExampleTopBar/StyledWrapper';
import TruncatedText from 'components/TruncatedText';
import {
  updateResponseExampleDescription,
  updateResponseExampleName
} from 'providers/ReduxStore/slices/collections';
import get from 'lodash/get';
import Button from 'ui/Button';

const MockResponseTopBar = ({
  item,
  collection,
  exampleUid,
  editMode,
  onEditToggle,
  onSave,
  onCancel,
  onDelete,
  copiedFrom
}) => {
  const dispatch = useDispatch();

  const example = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((entry) => entry.uid === exampleUid)
      : get(item, 'examples', []).find((entry) => entry.uid === exampleUid);
  }, [item.draft, item.examples, item, exampleUid]);

  const handleNameChange = (event) => {
    dispatch(updateResponseExampleName({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid,
      name: event.target.value
    }));
  };

  const handleDescriptionChange = (event) => {
    dispatch(updateResponseExampleDescription({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid,
      description: event.target.value
    }));
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
                    placeholder="Mock response name"
                    autoFocus
                    data-testid="mock-response-name-input"
                  />
                </div>
                <div>
                  <textarea
                    value={example?.description || ''}
                    onChange={handleDescriptionChange}
                    className="example-input example-input-description"
                    placeholder="Description"
                    rows={3}
                    data-testid="mock-response-description-input"
                  />
                </div>
                {copiedFrom?.exampleName ? (
                  <div className="text-xs opacity-60">
                    Copied from example: {copiedFrom.exampleName}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
              <Button
                color="secondary"
                onClick={onCancel}
                data-testid="mock-response-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                style={{ padding: '6px 12px' }}
                icon={<IconDeviceFloppy size={16} />}
                onClick={onSave}
                data-testid="mock-response-save-btn"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="p-4">
      <div className="max-w-full">
        <div className="flex items-center justify-between gap-6 md:flex-row flex-col">
          <div className="flex-1 min-w-0">
            <h2 className="response-example-title font-medium leading-tight" data-testid="mock-response-title">
              {example.name}
            </h2>
            {example.description && example.description.trim().length > 0 ? (
              <TruncatedText
                text={example.description}
                maxLines={2}
                className="response-example-description-container"
                textClassName="response-example-description leading-relaxed max-w-fit"
                buttonClassName="text-blue-600 hover:text-blue-800 font-medium"
                viewMoreText="View More"
                viewLessText="View Less"
                dataTestId="mock-response-description"
              />
            ) : null}
            {copiedFrom?.exampleName ? (
              <div className="text-xs opacity-60 mt-1">
                Copied from example: {copiedFrom.exampleName}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
            <Button
              color="secondary"
              size="sm"
              icon={<IconEdit size={16} />}
              onClick={onEditToggle}
              data-testid="mock-response-edit-btn"
            >
              Edit
            </Button>
            <Button
              color="danger"
              size="sm"
              onClick={onDelete}
              data-testid="mock-response-delete-btn"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default MockResponseTopBar;
