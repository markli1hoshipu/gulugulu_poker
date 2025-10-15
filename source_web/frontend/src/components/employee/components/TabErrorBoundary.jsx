import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error for debugging
    console.error('Employee Profile Tab Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { tabName = 'Tab' } = this.props;

      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Error Loading {tabName}</h3>
                <p className="text-sm text-gray-600">
                  There was an issue loading the {tabName.toLowerCase()} data for this employee.
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-1">Error Details:</p>
              <p className="text-sm text-red-600">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={() => console.log('Error Details:', this.state.error, this.state.errorInfo)}
                className="text-sm"
              >
                View Technical Details
              </Button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Troubleshooting:</strong> This error is isolated to this tab only.
                You can still access other tabs and employee information. If the problem persists,
                the employee may have incomplete data that needs to be updated.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TabErrorBoundary;