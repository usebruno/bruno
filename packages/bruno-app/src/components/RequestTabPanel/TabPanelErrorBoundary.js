import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import Button from 'ui/Button';

class TabPanelErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[TabPanelErrorBoundary] Unexpected render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
          <IconAlertTriangle size={36} strokeWidth={1.5} className="text-yellow-500" />
          <h2 className="text-lg font-medium">Something went wrong</h2>
          <p className="text-sm opacity-70 max-w-md">
            This tab encountered an unexpected error. Close the tab and try reopening the request.
          </p>
          <Button size="md" data-testid="tab-panel-error-boundary-close-tab" color="primary" onClick={this.props.onClose}>
            Close Tab
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const TabPanelErrorBoundary = ({ tabUid, children }) => {
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(closeTabs({ tabUids: [tabUid] }));
  };

  return (
    <TabPanelErrorBoundaryInner onClose={handleClose}>
      {children}
    </TabPanelErrorBoundaryInner>
  );
};

export default TabPanelErrorBoundary;
