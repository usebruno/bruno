import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';
import Button from 'ui/Button/index';

class QueryBuilderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[QueryBuilder] Unexpected render error:', error, errorInfo);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <StyledWrapper>
          <div className="schema-empty-state">
            <IconAlertTriangle size={32} strokeWidth={1.5} className="empty-state-icon warning" />
            <div className="empty-state-title">{this.props.t('QUERY_BUILDER.SOMETHING_WENT_WRONG')}</div>
            <div className="empty-state-description">
              {this.props.t('QUERY_BUILDER.ERROR_DESCRIPTION')}
            </div>
            <Button color="secondary" onClick={this.reset}>
              {this.props.t('QUERY_BUILDER.TRY_AGAIN')}
            </Button>
          </div>
        </StyledWrapper>
      );
    }
    return this.props.children;
  }
}

// Wrap with i18n HOC
const WrappedErrorBoundary = (props) => {
  const { t } = useTranslation();
  return <QueryBuilderErrorBoundary {...props} t={t} />;
};

export default WrappedErrorBoundary;
