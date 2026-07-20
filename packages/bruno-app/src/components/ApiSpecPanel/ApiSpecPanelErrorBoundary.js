import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { setActiveApiSpecUid } from 'providers/ReduxStore/slices/apiSpec';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';

class ApiSpecPanelErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ApiSpecPanelErrorBoundary] Unexpected render error:', error, errorInfo);
  }

  render() {
    const { theme, onClose } = this.props;

    if (this.state.hasError) {
      const errorMessage = this.state.error?.message;

      return (
        <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
          <IconAlertTriangle size={36} strokeWidth={1.5} style={{ color: theme?.status?.warning?.text }} />
          <h2 className="text-lg font-medium">Something went wrong</h2>
          <p className="text-sm opacity-70 max-w-md">
            This spec preview encountered an unexpected error, likely from an unresolvable
            reference in the spec. Close it and try reopening.
          </p>
          {errorMessage && (
            <p className="text-xs font-mono opacity-50 max-w-md break-all">{errorMessage}</p>
          )}
          <Button size="md" data-testid="api-spec-panel-error-boundary-close" color="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ApiSpecPanelErrorBoundary = ({ children }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  const handleClose = () => {
    dispatch(setActiveApiSpecUid({ uid: null }));
  };

  return (
    <ApiSpecPanelErrorBoundaryInner onClose={handleClose} theme={theme}>
      {children}
    </ApiSpecPanelErrorBoundaryInner>
  );
};

export default ApiSpecPanelErrorBoundary;
