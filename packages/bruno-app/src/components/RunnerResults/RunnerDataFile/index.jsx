import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconFileSpreadsheet, IconX } from '@tabler/icons';
import { browseFiles, getIterationDataPreview } from 'providers/ReduxStore/slices/collections/actions';
import { formatIpcError } from 'utils/common/error';
import path from 'utils/common/path';
import Button from 'ui/Button/index';
import StyledWrapper from './StyledWrapper';

const DATA_FILE_FILTERS = [{ name: 'CSV or JSON', extensions: ['csv', 'json'] }];
const MAX_COLUMNS_SHOWN = 5;

const formatColumns = (columns) => {
  const shown = columns.slice(0, MAX_COLUMNS_SHOWN).join(', ');
  const hiddenCount = columns.length - MAX_COLUMNS_SHOWN;
  return hiddenCount > 0 ? `${shown} +${hiddenCount} more` : shown;
};

/**
 * Picks the CSV/JSON file whose rows drive a data-driven collection run.
 * `dataFile` is `{ path, rowCount, columns }` or null; the file dialog opens in `defaultDirectory`.
 */
const RunnerDataFile = ({ dataFile, onChange, defaultDirectory }) => {
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const selectDataFile = async () => {
    const [filePath] = (await dispatch(browseFiles(DATA_FILE_FILTERS, [], defaultDirectory))) || [];
    if (!filePath) {
      return;
    }

    try {
      const { rowCount, columns } = await dispatch(getIterationDataPreview(filePath));
      setError(null);
      onChange({ path: filePath, rowCount, columns });
    } catch (err) {
      setError(formatIpcError(err));
    }
  };

  const clearDataFile = () => {
    setError(null);
    onChange(null);
  };

  return (
    <StyledWrapper data-testid="runner-data-file">
      {dataFile ? (
        <div className="flex items-start gap-2">
          <IconFileSpreadsheet size={18} strokeWidth={1.5} className="flex-shrink-0 mt-[2px]" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate" title={dataFile.path} data-testid="runner-data-file-name">
              {path.basename(dataFile.path)}
            </span>
            <span className="data-file-details text-xs" data-testid="runner-data-file-details">
              {dataFile.rowCount} {dataFile.rowCount === 1 ? 'row' : 'rows'}
              {dataFile.columns.length > 0 ? ` · ${formatColumns(dataFile.columns)}` : ''}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            color="secondary"
            icon={<IconX size={14} strokeWidth={1.5} />}
            title="Remove data file"
            aria-label="Remove data file"
            data-testid="runner-data-file-remove"
            onClick={clearDataFile}
          />
        </div>
      ) : (
        <Button size="sm" variant="outline" color="secondary" data-testid="runner-data-file-select" onClick={selectDataFile}>
          Select CSV or JSON file
        </Button>
      )}
      {error ? (
        <div className="data-file-error text-xs mt-2" data-testid="runner-data-file-error">
          {error}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default RunnerDataFile;
