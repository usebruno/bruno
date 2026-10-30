import ToggleSwitch from 'components/ToggleSwitch';
import ImportSettingRow from 'components/Sidebar/ImportSettingRow';

const CheckForSpecUpdatesOption = ({ checked, onChange, disabled = false, showSwagger2Note = false, testId, descriptionTestId, className }) => (
  <ImportSettingRow
    className={className}
    label="Check for Spec Updates"
    description={showSwagger2Note
      ? 'OpenAPI Sync is not supported for Swagger 2.0 specs.'
      : 'Stay notified of spec changes and sync your collection with the spec.'}
    descriptionTestId={descriptionTestId}
    disabled={disabled}
    isSwitch
  >
    <ToggleSwitch isOn={checked} handleToggle={() => onChange(!checked)} disabled={disabled} size="2xs" data-testid={testId} />
  </ImportSettingRow>
);

export default CheckForSpecUpdatesOption;
