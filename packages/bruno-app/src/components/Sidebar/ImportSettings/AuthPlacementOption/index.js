import ToggleSwitch from 'components/ToggleSwitch';
import ImportSettingRow from 'components/Sidebar/ImportSettings/ImportSettingRow';

const AuthPlacementOption = ({ value, onChange, disabled = false }) => {
  const isCollection = value === 'collection';

  return (
    <ImportSettingRow
      label="Inherit authentication from collection folder"
      info="When enabled, requests inherit authentication from the collection folder. When disabled, authentication is copied to each request."
      description="Requests inherit auth from collection instead of getting their own copy."
      disabled={disabled}
      isSwitch
    >
      <ToggleSwitch
        isOn={isCollection}
        handleToggle={() => onChange(isCollection ? 'request' : 'collection')}
        size="2xs"
        disabled={disabled}
        data-testid="auth-placement-toggle"
      />
    </ImportSettingRow>
  );
};

export default AuthPlacementOption;
