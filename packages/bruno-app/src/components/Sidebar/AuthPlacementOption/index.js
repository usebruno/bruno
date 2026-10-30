import ToggleSwitch from 'components/ToggleSwitch';
import ImportSettingRow from 'components/Sidebar/ImportSettingRow';

const AuthPlacementOption = ({ value, onChange, disabled = false }) => {
  const isCollection = value === 'collection';

  return (
    <ImportSettingRow
      label="Set authentication at collection level"
      info="On import, the spec's security scheme is added to the collection. Operations with a different scheme keep their own auth."
      description="Requests and folders inherit it instead of getting their own copy."
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
