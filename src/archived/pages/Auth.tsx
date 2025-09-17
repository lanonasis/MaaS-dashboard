
import { Layout } from "@/components/layout/Layout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCentralAuth } from "@/hooks/useCentralAuth";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, signOut, isLoading, user } = useCentralAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");
  
  // Redirect if already logged in - but only if not on root path
  useEffect(() => {
    if (user && location.pathname !== '/') {
      navigate('/dashboard');
    } else if (user && location.pathname === '/') {
      // For root path, show a welcome back message and provide dashboard link
      navigate('/dashboard');
    }
  }, [user, navigate, location.pathname]);

  // Set mode based on URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("register")) {
      setMode("register");
    } else if (path.includes("forgot-password")) {
      setMode("forgot-password");
    } else {
      setMode("login");
    }
  }, [location.pathname]);

  const handleSubmit = async (data: any) => {
    // Redirect to central auth page instead of handling locally
    const currentUrl = window.location.origin;
    const authUrl = `https://api.LanOnasis.com/auth/login?platform=dashboard&redirect_url=${encodeURIComponent(currentUrl + '/dashboard')}`;
    
    window.location.href = authUrl;
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <AuthForm 
            mode={mode} 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
