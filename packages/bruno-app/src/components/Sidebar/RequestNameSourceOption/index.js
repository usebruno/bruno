import ImportSettingRow from 'components/Sidebar/ImportSettingRow';
import ImportSettingDropdown from 'components/Sidebar/ImportSettingDropdown';

const requestNameSourceOptions = [
  { value: 'summary', label: 'Summary' },
  { value: 'operationId', label: 'operationId' },
  { value: 'description', label: 'Description' },
  { value: 'path', label: 'Path' }
];

const RequestNameSourceOption = ({ value, onChange, disabled = false }) => (
  <ImportSettingRow
    label="Naming requests"
    info="If an operation doesn't have the selected field, Bruno falls back to summary, operationId, description, then method and path."
    description="How requests in the generated collection are named."
    disabled={disabled}
  >
    <ImportSettingDropdown options={requestNameSourceOptions} value={value} onChange={onChange} testId="request-name-source" disabled={disabled} />
  </ImportSettingRow>
);

export default RequestNameSourceOption;
