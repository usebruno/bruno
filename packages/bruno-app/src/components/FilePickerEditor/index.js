import React, { useEffect, useId, useState } from 'react';
import { getRelativePathWithinBasePath, getAbsoluteFilePath } from 'utils/common/path';
import { existsSync } from 'utils/filesystem';
import { useDispatch } from 'react-redux';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { IconX, IconUpload, IconFile } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { isWindowsOS } from 'utils/common/platform';
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
  const warningTooltipId = `file-picker-warning-${useId().replace(/:/g, '')}`;
  const [hasMissingFiles, setHasMissingFiles] = useState(false);

  const filePaths = (isSingleFilePicker ? [value] : value || []).filter((v) => v != null && v != '');
  const filenames = filePaths.map((v) => v.split(/[\\/]/).pop());

  // title is shown when hovering over the button
  const title = filenames.map((v) => `- ${v}`).join('\n');

  // Verify that the selected file(s) still exist on disk and warn the user otherwise
  useEffect(() => {
    let isMounted = true;

    if (filePaths.length === 0) {
      setHasMissingFiles(false);
      return;
    }

    Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const absolutePath = collection?.pathname
            ? getAbsoluteFilePath(collection.pathname, filePath)
            : filePath;
          return await existsSync(absolutePath);
        } catch (error) {
          return false;
        }
      })
    )
      .then((results) => {
        if (isMounted) {
          setHasMissingFiles(results.some((exists) => !exists));
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasMissingFiles(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(filePaths), collection?.pathname]);

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
          title={title}
          onClick={!readOnly ? browse : undefined}
        >
          {hasMissingFiles ? (
            <>
              <svg
                data-tooltip-id={warningTooltipId}
                className="warning-icon"
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1.67c.955 0 1.845 .467 2.39 1.247l.105 .16l8.114 13.548a2.914 2.914 0 0 1 -2.307 4.363l-.195 .008h-16.225a2.914 2.914 0 0 1 -2.582 -4.2l.099 -.185l8.11 -13.538a2.914 2.914 0 0 1 2.491 -1.401zm.01 13.33l-.127 .007a1 1 0 0 0 0 1.986l.117 .007l.127 -.007a1 1 0 0 0 0 -1.986l-.117 -.007zm-.01 -7a1 1 0 0 0 -.993 .883l-.007 .117v4l.007 .117a1 1 0 0 0 1.986 0l.007 -.117v-4l-.007 -.117a1 1 0 0 0 -.993 -.883z" />
              </svg>

            </>
          ) : (
            <IconFile size={16} className="file-icon" />
          )}
          <span className="file-name">
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
              className="tooltip-mod max-w-lg"
              place="bottom-end"
            >
              <div className="warning-tooltip">The file above is not in the given directory, please upload it again.</div>
            </Tooltip>
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
