import classnames from 'classnames';
import Help from 'components/Help';
import StyledWrapper from './StyledWrapper';

const preventToggle = (event) => event.preventDefault();

const ImportSettingRow = ({ label, description, info, isSwitch = false, disabled = false, className, descriptionTestId, children }) => (
  <StyledWrapper
    as={isSwitch ? 'label' : 'div'}
    className={classnames('flex gap-4 items-center justify-between', className, {
      'cursor-pointer': isSwitch && !disabled,
      'opacity-50 pointer-events-none': disabled
    })}
  >
    <div>
      <div className="flex items-center gap-1 font-medium">
        {label}
        {info && (
          <div className="pointer-events-auto" onClick={preventToggle}>
            <Help icon="info" width="260">
              {info}
            </Help>
          </div>
        )}
      </div>
      <p className="text-muted text-xs mt-1" data-testid={descriptionTestId}>{description}</p>
    </div>
    {children}
  </StyledWrapper>
);

export default ImportSettingRow;
