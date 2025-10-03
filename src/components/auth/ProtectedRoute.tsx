import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('ProtectedRoute: Checking authentication status', { isLoading, user: !!user });
    if (!isLoading && !user) {
      console.log('ProtectedRoute: User not authenticated, redirecting to auth');
      // Store the attempted route for redirect after login
      const redirectPath = location.pathname + location.search;
      console.log('ProtectedRoute: Storing redirect path', redirectPath);
      if (redirectPath !== '/dashboard') {
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
      
      // Redirect to the index page with auth form
      navigate('/?showAuth=true');
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