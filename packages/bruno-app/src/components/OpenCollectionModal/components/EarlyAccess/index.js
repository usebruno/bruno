import { IconCheck, IconExternalLink } from '@tabler/icons';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';

const EARLY_ACCESS_FORM_URL = 'https://forms.gle/REPLACE_WITH_EARLY_ACCESS_FORM';

const EarlyAccess = ({ feature, icon: Icon, title, subtitle, points }) => (
  <StyledWrapper>
    <div className="early-access" data-testid={`open-collection-early-access-${feature}`}>
      <span className="early-access-icon">
        <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h4 className="early-access-title">{title}</h4>
      <span className="early-access-subtitle">{subtitle}</span>
      <ul className="early-access-points">
        {points.map((point) => (
          <li key={point}>
            <IconCheck size={14} strokeWidth={2.2} aria-hidden="true" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <Button
        color="primary"
        size="sm"
        icon={<IconExternalLink size={14} strokeWidth={1.75} />}
        iconPosition="right"
        onClick={() => window.ipcRenderer.openExternal(`${EARLY_ACCESS_FORM_URL}?feature=${feature}`)}
        data-testid={`open-collection-early-access-request-${feature}`}
      >
        Request early access
      </Button>
    </div>
  </StyledWrapper>
);

export default EarlyAccess;
