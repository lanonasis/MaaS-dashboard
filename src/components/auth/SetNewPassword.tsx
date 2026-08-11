import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * SetNewPassword
 *
 * Completes the password-recovery flow. Mounted by SupabaseAuthRedirect
 * when the auth event is PASSWORD_RECOVERY (the recovery link returned
 * a session and we now need to capture and set the new password).
 */
const SetNewPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Confirm we have a recovery session before mounting the form.
  // If the user lands here without one (e.g. direct nav), redirect to login.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error || !data.session) {
        setHasSession(false);
      } else {
        setHasSession(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please confirm the new password before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: 'Password updated',
        description: 'Your password has been reset. You are now signed in.',
      });
      // Sign out of the recovery session so the user re-authenticates cleanly
      // on the dashboard; alternatively just redirect to dashboard.
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password.';
      toast({
        title: 'Password reset failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (hasSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset link expired</CardTitle>
            <CardDescription>
              This password reset link is no longer valid. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AnimatedButton
              type="button"
              className="w-full"
              onClick={() => navigate('/?showAuth=true&mode=forgot-password')}
            >
              Request a new reset link
            </AnimatedButton>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (hasSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Preparing password reset…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>
            Enter your new password below. Choose something at least 6 characters long.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                name="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <AnimatedButton type="submit" className="w-full" isLoading={isLoading}>
              Update password
            </AnimatedButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetNewPassword;
