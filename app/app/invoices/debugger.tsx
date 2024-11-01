import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthData {
  user?: {
    email?: string;
    name?: string;
  } | null;
}

interface ApiResponse {
  status: number;
  data: {
    error?: string;
    invoices?: any[];
  };
}

interface DebugState {
  loading: boolean;
  auth: AuthData | null;
  apiResponse: ApiResponse | null;
  error: string | null;
}

interface StatusItemProps {
  label: string;
  success: boolean;
  details: string;
}

const InvoiceDebugger = () => {
  const [debugState, setDebugState] = useState<DebugState>({
    loading: true,
    auth: null,
    apiResponse: null,
    error: null
  });

  useEffect(() => {
    const checkSystem = async () => {
      try {
        // Check auth status
        const authResponse = await fetch('/api/auth/session');
        const authData: AuthData = await authResponse.json();

        // Check invoice endpoint with detailed error handling
        const invoiceResponse = await fetch('/api/user/stripe/customer/invoices', {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        const responseData = await invoiceResponse.json();

        setDebugState({
          loading: false,
          auth: authData,
          apiResponse: {
            status: invoiceResponse.status,
            data: responseData
          },
          error: null
        });
      } catch (err) {
        setDebugState({
          loading: false,
          auth: null,
          apiResponse: null,
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    };

    checkSystem();
  }, []);

  const StatusItem: React.FC<StatusItemProps> = ({ label, success, details }) => (
    <div className="flex items-center gap-2 p-2">
      {success ? 
        <CheckCircle2 className="text-green-500" size={20} /> : 
        <AlertCircle className="text-red-500" size={20} />
      }
      <span className="font-medium">{label}:</span>
      <span className={success ? "text-green-600" : "text-red-600"}>{details}</span>
    </div>
  );

  if (debugState.loading) {
    return <div className="p-4">Checking system status...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Invoice System Diagnostics</h2>
      
      <div className="space-y-2">
        <StatusItem 
          label="Authentication"
          success={!!debugState.auth?.user}
          details={debugState.auth?.user ? 'Authenticated' : 'Not authenticated'}
        />

        <StatusItem 
          label="API Response"
          success={debugState.apiResponse?.status === 200}
          details={`Status: ${debugState.apiResponse?.status || 'N/A'}`}
        />

        {debugState.apiResponse?.data?.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <h3 className="font-medium text-red-800">Error Details:</h3>
            <p className="text-red-600">{debugState.apiResponse.data.error}</p>
          </div>
        )}

        {debugState.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <h3 className="font-medium text-red-800">System Error:</h3>
            <p className="text-red-600">{debugState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDebugger;