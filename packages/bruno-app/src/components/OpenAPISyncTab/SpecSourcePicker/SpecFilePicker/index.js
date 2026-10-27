import { useRef } from 'react';
import { parseFileAsJsonOrYaml } from 'utils/importers/file-reader';
import { getOpenApiSpecError } from 'components/OpenAPISyncTab/SpecSourcePicker/utils';
import StyledWrapper from './StyledWrapper';

const SpecFilePicker = ({ value, onChange, onError }) => {
  const fileInputRef = useRef(null);
  const latestPickRef = useRef(0);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const pick = latestPickRef.current + 1;
    latestPickRef.current = pick;
    // fileInputRef is cleared when the picker unmounts, so a stale read after a tab switch is dropped too.
    const isLatestPick = () => latestPickRef.current === pick && fileInputRef.current !== null;

    onError(null);
    try {
      const data = await parseFileAsJsonOrYaml(file);
      if (!isLatestPick()) return;
      const error = getOpenApiSpecError(data);
      if (error) {
        onError(error);
        return;
      }
      const filePath = window.ipcRenderer.getFilePath(file);
      if (filePath) onChange(filePath);
    } catch (err) {
      if (isLatestPick()) onError(err.message || 'Failed to read the selected file');
    }
  };

  return (
    <StyledWrapper>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.yaml,.yml"
        className="file-input"
        onChange={handleFileChange}
        data-testid="spec-source-file-input"
      />
      <button
        type="button"
        className="source-input file-pick-btn"
        onClick={() => fileInputRef.current?.click()}
        data-testid="spec-source-file-button"
      >
        {value ? value.split(/[\\/]/).pop() : 'Select File'}
      </button>
    </StyledWrapper>
  );
};

export default SpecFilePicker;
