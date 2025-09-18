import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCentralAuth } from "@/hooks/useCentralAuth";
import { Layout } from "@/components/layout/Layout";
import { Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react";

const ExternalAuth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCentralAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [authStatus, setAuthStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [authMessage, setAuthMessage] = useState('Processing authentication...');

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate('/dashboard');
      return;
    }

    processExternalAuth();
  }, [user, navigate, location]);

  const processExternalAuth = async () => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const state = searchParams.get('state');
      const platform = searchParams.get('platform');
      const code = searchParams.get('code') || 'temp_auth_code'; // In real implementation, this would come from OAuth flow

      if (!state || !platform) {
        setAuthStatus('error');
        setAuthMessage('Missing authentication parameters');
        setIsProcessing(false);
        return;
      }

      setAuthMessage(`Authenticating ${platform} access...`);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, you would:
      // 1. Verify the state parameter
      // 2. Exchange code for access token
      // 3. Get user info from external platform
      // 4. Create or link account
      // 5. Generate session tokens

      // For now, we'll create a temporary success state
      setAuthStatus('success');
      setAuthMessage(`Successfully authenticated with ${platform}!`);
      
      toast({
        title: "Authentication Successful",
        description: `You've been authenticated via ${platform}. Redirecting to dashboard...`,
      });

      // Redirect to dashboard after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('External auth error:', error);
      setAuthStatus('error');
      setAuthMessage('Authentication failed. Please try again.');
      
      toast({
        title: "Authentication Failed",
        description: "There was an error processing your authentication. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (authStatus) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (authStatus) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-card shadow-subtle-md rounded-lg border border-gray-200/60 dark:border-gray-700/60 p-8">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                {getStatusIcon()}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                External Authentication
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Completing your authentication process
              </p>
            </div>

            {/* Status */}
            <div className="text-center space-y-4">
              <div className={`text-lg font-medium ${getStatusColor()}`}>
                {authMessage}
              </div>

              {authStatus === 'processing' && (
                <div className="text-sm text-muted-foreground">
                  Please wait while we verify your credentials...
                </div>
              )}

              {authStatus === 'success' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    You will be redirected to the dashboard shortly.
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center space-x-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Go to Dashboard Now</span>
                  </button>
                </div>
              )}

              {authStatus === 'error' && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Please try authenticating again or contact support if the issue persists.
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate('/auth/login')}
                      className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-muted-foreground">
              <div>
                Secured by{" "}
                <span className="font-medium text-primary">LanOnasis Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExternalAuth;