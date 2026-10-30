import ImportSettingRow from 'components/Sidebar/ImportSettingRow';
import ImportSettingDropdown from 'components/Sidebar/ImportSettingDropdown';

const folderArrangementOptions = [
  { value: 'tags', label: 'Tags' },
  { value: 'path', label: 'Paths' }
];

const FolderArrangementOption = ({ value, onChange, disabled = false, className }) => (
  <ImportSettingRow
    className={className}
    label="Folder arrangement"
    description="Select whether to create folders according to the spec's paths or tags."
    disabled={disabled}
  >
    <ImportSettingDropdown options={folderArrangementOptions} value={value} onChange={onChange} testId="grouping" disabled={disabled} />
  </ImportSettingRow>
);

export default FolderArrangementOption;
