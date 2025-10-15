// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2 } from 'lucide-react';
import googleLogo from '../assets/google_logo.svg';
import microsoftLogo from '../assets/microsoft_logo.svg';

function LoginPage() {
  const { loginWith, authError, isLoading } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleGoogleLogin = () => {
    setLoadingProvider('google');
    loginWith('google');
  };

  const handleMicrosoftLogin = () => {
    setLoadingProvider('microsoft');
    loginWith('microsoft');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Prelude</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your preferred sign-in method
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {authError && (
            <Alert variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleGoogleLogin} 
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading && loadingProvider === 'google' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <img
                src={googleLogo}
                alt="Google"
                className="mr-2 h-4 w-4"
              />
            )}
            {isLoading && loadingProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <Button 
            onClick={handleMicrosoftLogin} 
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading && loadingProvider === 'microsoft' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <img
                src={microsoftLogo}
                alt="Microsoft"
                className="mr-2 h-4 w-4"
              />
            )}
            {isLoading && loadingProvider === 'microsoft' ? 'Signing in...' : 'Continue with Microsoft'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Secure authentication
              </span>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;