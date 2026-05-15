import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import IconEdit from 'components/Icons/IconEdit';
import { IconCode, IconDeviceFloppy } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';
import TruncatedText from 'components/TruncatedText';
import { updateResponseExampleName, updateResponseExampleDescription } from 'providers/ReduxStore/slices/collections';
import get from 'lodash/get';
import Button from 'ui/Button';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
                    placeholder={t('RESPONSE_EXAMPLE.ENTER_NAME')}
                    autoFocus
                    data-testid="response-example-name-input"
                  />
                </div>
                <div>
                  <textarea
                    value={example?.description || ''}
                    onChange={handleDescriptionChange}
                    className="example-input example-input-description"
                    placeholder={t('RESPONSE_EXAMPLE.ENTER_DESCRIPTION')}
                    rows={3}
                    data-testid="response-example-description-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
              <Button
                color="secondary"
                onClick={handleCancel}
                data-testid="response-example-cancel-btn"
              >
                {t('COMMON.CANCEL')}
              </Button>
              <Button
                color="primary"
                style={{ padding: '6px 12px' }}
                icon={<IconDeviceFloppy size={16} />}
                onClick={handleSave}
                data-testid="response-example-save-btn"
              >
                {t('COMMON.SAVE')}
              </Button>
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
        <div className="flex items-center justify-between gap-6 md:flex-row flex-col">
          <div className="flex-1 min-w-0">
            <h2 className="response-example-title font-medium leading-tight" data-testid="response-example-title">
              <span className="opacity-60">{item.name}</span>
              {' / '}
              <span>{example.name}</span>
            </h2>
            {example.description && example.description.trim().length > 0 && (
              <TruncatedText
                text={example.description}
                maxLines={2}
                className="response-example-description-container"
                textClassName="response-example-description leading-relaxed max-w-fit"
                buttonClassName="text-blue-600 hover:text-blue-800 font-medium"
                viewMoreText={t('RESPONSE_EXAMPLE.VIEW_MORE')}
                viewLessText={t('RESPONSE_EXAMPLE.VIEW_LESS')}
                dataTestId="response-example-description"
              />
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 md:w-auto w-full md:justify-end">
            <Button
              color="secondary"
              size="sm"
              icon={<IconCode size={16} color={theme.examples.buttonIconColor} />}
              onClick={handleGenerateCode}
              title={t('RESPONSE_EXAMPLE.GENERATE_CODE')}
              data-testid="response-example-generate-code-btn"
            />
            <Button
              color="secondary"
              size="sm"
              icon={<IconEdit size={16} color={theme.examples.buttonIconColor} />}
              onClick={onEditToggle}
              data-testid="response-example-edit-btn"
            >
              {t('RESPONSE_EXAMPLE.EDIT_EXAMPLE')}
            </Button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleTopBar;
