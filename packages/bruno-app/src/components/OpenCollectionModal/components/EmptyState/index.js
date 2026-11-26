import { IconLoader2 } from '@tabler/icons';
import { focusWhenFocusIsLost } from '../../utils/focus';
import StyledWrapper from './StyledWrapper';

const focusFirstActionWhenFocusIsLost = (actions) => focusWhenFocusIsLost(actions?.querySelector('button'));

const EmptyState = ({ icon: Icon, isLoading = false, title, children, actions, foot, 'data-testid': testId }) => (
  <StyledWrapper role={isLoading ? 'status' : undefined} data-testid={testId}>
    <div className="empty-state">
      {isLoading && <IconLoader2 size={20} className="empty-state-spinner" aria-hidden="true" />}
      {Icon && (
        <span className="empty-state-icon">
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      <p className="empty-state-text">{children}</p>
      {actions && (
        <div ref={focusFirstActionWhenFocusIsLost} className="empty-state-actions">
          {actions}
        </div>
      )}
      {foot && <p className="empty-state-foot">{foot}</p>}
    </div>
  </StyledWrapper>
);

export default EmptyState;
