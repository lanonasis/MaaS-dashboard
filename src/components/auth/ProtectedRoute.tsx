import { useEffect } from "react";
import { useCentralAuth } from "@/hooks/useCentralAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useCentralAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store the attempted route for redirect after login
      const redirectPath = location.pathname + location.search;
      if (redirectPath !== '/dashboard') {
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
      
      // Redirect to central auth system instead of local auth routes
      const currentUrl = window.location.origin;
      const authUrl = `https://api.lanonasis.com/auth/login?platform=dashboard&redirect_url=${encodeURIComponent(currentUrl + (redirectPath || '/dashboard'))}`;
      window.location.href = authUrl;
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};