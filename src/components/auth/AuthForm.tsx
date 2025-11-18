import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase, getRedirectUrl } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GoogleIcon, GitHubIcon, LinkedInIcon, DiscordIcon, AppleIcon } from '@/components/icons/social-providers';

type AuthMode = 'login' | 'register' | 'forgot-password';

const formConfig: Record<AuthMode, { title: string; description: string; cta: string; footerText: string; footerAction: string }> = {
  login: {
    title: 'Sign in',
    description: 'Enter your credentials to access your account',
    cta: 'Sign in',
    footerText: "Don't have an account?",
    footerAction: 'Create one',
  },
  register: {
    title: 'Create an account',
    description: 'Enter your details to create a new account',
    cta: 'Create account',
    footerText: 'Already have an account?',
    footerAction: 'Sign in',
  },
  'forgot-password': {
    title: 'Reset your password',
    description: "We'll send you a reset link",
    cta: 'Send reset link',
    footerText: 'Remember your password?',
    footerAction: 'Back to sign in',
  },
};

const AuthForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setIsLoading(false);
    setShowPassword(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (mode !== 'forgot-password') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    if (mode === 'register') {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: 'Welcome back!',
          description: 'You have been successfully signed in.',
        });
        navigate('/dashboard');
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name },
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (error) throw error;

        toast({
          title: 'Registration successful!',
          description: 'Please check your email to confirm your account.',
        });
        switchMode('login');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: getRedirectUrl(),
        });

        if (error) throw error;

        toast({
          title: 'Reset link sent',
          description: 'Check your email for password reset instructions.',
        });
        switchMode('login');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast({
        title: 'Authentication failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin' | 'discord' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
        },
      });

      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to login with ${provider}`;
      toast({
        title: 'Login failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const { title, description, cta, footerText, footerAction } = formConfig[mode];
  const footerTargetMode: AuthMode = mode === 'login' ? 'register' : 'login';

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={cn(errors.email && 'border-destructive focus-visible:ring-destructive')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {mode !== 'forgot-password' && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => switchMode('forgot-password')}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={cn(errors.password && 'border-destructive focus-visible:ring-destructive pr-10')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={cn(errors.confirmPassword && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>
                )}
              </>
            )}

            <AnimatedButton type="submit" className="w-full" isLoading={isLoading}>
              {cta}
            </AnimatedButton>
          </form>

          {mode !== 'forgot-password' && (
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" type="button" className="w-full" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                  <GoogleIcon />
                  <span className="ml-2">Google</span>
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={() => handleSocialLogin('github')} disabled={isLoading}>
                  <GitHubIcon />
                  <span className="ml-2">GitHub</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" type="button" className="w-full" onClick={() => handleSocialLogin('linkedin')} disabled={isLoading}>
                  <LinkedInIcon />
                  <span className="ml-2">LinkedIn</span>
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={() => handleSocialLogin('discord')} disabled={isLoading}>
                  <DiscordIcon />
                  <span className="ml-2">Discord</span>
                </Button>
                <Button variant="outline" type="button" className="w-full" onClick={() => handleSocialLogin('apple')} disabled={isLoading}>
                  <AppleIcon />
                  <span className="ml-2">Apple</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-center">
          <div className="space-y-1">
            <div>
              <span>{footerText} </span>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => switchMode(footerTargetMode)}
              >
                {footerAction}
              </button>
            </div>
            <div>
              <Link to="/landing" className="text-blue-600 hover:underline">
                Learn more about LanOnasis Platform
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthForm;
