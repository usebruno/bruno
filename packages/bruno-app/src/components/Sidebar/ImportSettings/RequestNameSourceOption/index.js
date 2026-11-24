import { REQUEST_NAME_SOURCES } from '@usebruno/common';
import ImportSettingRow from 'components/Sidebar/ImportSettings/ImportSettingRow';
import ImportSettingDropdown from 'components/Sidebar/ImportSettings/ImportSettingDropdown';

export const requestNameSourceLabels = {
  summary: 'Summary',
  operationId: 'OperationId',
  description: 'Description',
  path: 'Path'
};

const requestNameSourceOptions = REQUEST_NAME_SOURCES.map((value) => ({ value, label: requestNameSourceLabels[value] }));

const RequestNameSourceOption = ({ value, onChange, disabled = false }) => (
  <ImportSettingRow
    label="Naming requests"
    info="If an operation doesn't have the selected option, Bruno falls back in the following order: summary → operationId → description → path."
    description="How requests in the generated collection are named."
    disabled={disabled}
  >
    <ImportSettingDropdown options={requestNameSourceOptions} value={value} onChange={onChange} testId="request-name-source" disabled={disabled} />
  </ImportSettingRow>
);

export default RequestNameSourceOption;
