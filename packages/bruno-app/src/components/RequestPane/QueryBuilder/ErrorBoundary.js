import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
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
            <div className="empty-state-title">Something went wrong</div>
            <div className="empty-state-description">
              The Query Builder encountered an unexpected error. Try reloading the schema or manually using the editor.
            </div>
            <Button color="secondary" onClick={this.reset}>
              Try Again
            </Button>
          </div>
        </StyledWrapper>
      );
    }
    return this.props.children;
  }
}

export default QueryBuilderErrorBoundary;
