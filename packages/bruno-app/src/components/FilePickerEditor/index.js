import React from 'react';
import { getRelativePathWithinBasePath, getBasename } from 'utils/common/path';
import { useDispatch } from 'react-redux';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { IconX, IconUpload, IconFile } from '@tabler/icons';
import Tooltip from 'ui/Tooltip';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import useMissingFileCheck from 'hooks/useMissingFileCheck';
import useTooltipId from 'hooks/useTooltipId';
import { useTheme } from 'providers/Theme';
import StyledWrapper from './StyledWrapper';

/**
 * FilePickerEditor component for selecting files
 *
 * @param {Object} props
 * @param {string|string[]} props.value - Selected file path(s)
 * @param {Function} props.onChange - Callback when file selection changes
 * @param {Object} props.collection - Collection object with pathname
 * @param {boolean} props.isSingleFilePicker - If true, only allows single file selection
 * @param {boolean} props.readOnly - If true, disables file selection
 * @param {string} props.displayMode - Display mode: 'label', 'icon', or 'labelAndIcon' (default: 'label')
 * @param {string} props.label - Custom label text (defaults to "Select File" or "Select Files")
 * @param {React.ComponentType} props.icon - Custom icon component (defaults to IconUpload)
 */
const FilePickerEditor = ({
  value,
  onChange,
  collection,
  isSingleFilePicker = false,
  readOnly = false,
  displayMode = 'label',
  label,
  icon: CustomIcon
}) => {
  const dispatch = useDispatch();
  const warningTooltipId = useTooltipId('file-picker-warning');
  const { theme } = useTheme();

  const filePaths = (isSingleFilePicker ? [value] : value || []).filter((v) => v != null && v != '');
  const filenames = filePaths.map((v) => getBasename(collection.pathname, v));
  const { status, missingPaths } = useMissingFileCheck(filePaths, collection?.pathname);
  const hasMissingFiles = status === 'ready' && missingPaths.length > 0;

  // title is shown when hovering over the button
  const title = filenames.length > 1
    ? filenames.map((v) => `- ${v}`).join('\n')
    : filenames[0] ?? '';

  const browse = () => {
    if (readOnly) return;

    dispatch(browseFiles([], [!isSingleFilePicker ? 'multiSelections' : '']))
      .then((filePaths) => {
        // If file is in the collection's directory, then we use relative path
        // Otherwise, we use the absolute path
        filePaths = filePaths.map((filePath) => {
          return getRelativePathWithinBasePath(collection.pathname, filePath);
        });

        onChange(isSingleFilePicker ? filePaths[0] : filePaths);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange(isSingleFilePicker ? '' : []);
  };

  const renderButtonText = (filenames) => {
    if (filenames.length == 1) {
      return filenames[0];
    }
    return filenames.length + ' file(s) selected';
  };

  const defaultLabel = isSingleFilePicker ? 'Select File' : 'Select Files';
  const displayLabel = label || defaultLabel;
  const IconComponent = CustomIcon || IconUpload;

  // Render the button content based on displayMode
  const renderButtonContent = () => {
    switch (displayMode) {
      case 'icon':
        return <IconComponent size={16} />;
      case 'labelAndIcon':
        return (
          <>
            <span className="label">{displayLabel}</span>
            <IconComponent size={16} />
          </>
        );
      case 'label':
      default:
        return <span>{displayLabel}</span>;
    }
  };

  // When files are selected, show file info with clear button
  if (filenames.length > 0) {
    return (
      <StyledWrapper>
        <div
          className={`file-picker-selected ${readOnly ? 'read-only' : ''} ${hasMissingFiles ? 'has-warning' : ''}`}
          onClick={!readOnly ? browse : undefined}
        >
          {hasMissingFiles ? (
            <IconAlertTriangleFilled
              data-tooltip-id={warningTooltipId}
              className="warning-icon"
              size={16}
            />
          ) : (
            <IconFile size={16} className="file-icon" />
          )}
          <span className="file-name" title={title}>
            {renderButtonText(filenames)}
          </span>
          {!readOnly && (
            <button
              className="clear-btn"
              onClick={clear}
              title="Remove file"
              type="button"
            >
              <IconX size={16} />
            </button>
          )}
          {hasMissingFiles && (
            <Tooltip
              id={warningTooltipId}
              place="bottom-end"
              delayShow={0}
              tooltipTestId="file-picker-warning-tooltip"
              content={(
                <span className="flex items-center gap-1.5">
                  <IconAlertTriangleFilled size={14} className="shrink-0" style={{ color: theme.status.warning.text }} />
                  The file above is not in the given directory, please upload it again.
                </span>
              )}
            />
          )}
        </div>
      </StyledWrapper>
    );
  }

  // When no files selected, show the picker button
  return (
    <StyledWrapper>
      <button
        className={`file-picker-btn ${readOnly ? 'read-only' : ''} ${displayMode === 'icon' ? 'icon-only' : ''} ${displayMode === 'labelAndIcon' ? 'icon-right' : ''}`}
        onClick={browse}
        disabled={readOnly}
        type="button"
        title={displayLabel}
      >
        {renderButtonContent()}
      </button>
    </StyledWrapper>
  );
};

export default FilePickerEditor;
