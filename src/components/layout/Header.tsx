
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatedButton } from "../ui/AnimatedButton";
import { cn } from "@/lib/utils";
import { Menu, X, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "../LanguageSwitcher";

const navItems = [
  { name: "header.nav.home", path: "/" },
  { name: "header.nav.features", path: "/#features" },
  { name: "header.nav.about", path: "/#about" },
];

export const Header = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  if (isDashboard) return null;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-out-expo",
        isScrolled
          ? "glass-effect shadow-subtle py-3"
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl sm:text-2xl font-semibold tracking-tight flex-shrink-0"
        >
          <span className="text-primary">LanOnasis</span>
          <span className="text-foreground hidden sm:inline">Platform</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <ul className="flex items-center gap-6 xl:gap-8">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "text-sm font-medium transition-all duration-300 hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:origin-bottom-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100 whitespace-nowrap",
                    location.pathname === item.path && "text-primary after:scale-x-100"
                  )}
                >
                  {t(item.name)}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="flex items-center gap-2 xl:gap-4 ml-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-full hover:bg-muted transition-colors duration-200 flex-shrink-0"
                  aria-label="Theme settings"
                >
                  {resolvedTheme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4 mr-2" />
                  {t('header.theme.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4 mr-2" />
                  {t('header.theme.dark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="h-4 w-4 mr-2" />
                  {t('header.theme.system')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link to="/auth/login" className="flex-shrink-0">
              <AnimatedButton variant="ghost" size="sm" className="text-xs sm:text-sm">
                {t('header.login')}
              </AnimatedButton>
            </Link>
            <Link to="/auth/register" className="flex-shrink-0">
              <AnimatedButton variant="default" size="sm" className="text-xs sm:text-sm">
                {t('header.signup')}
              </AnimatedButton>
            </Link>
          </div>
        </nav>

        {/* Tablet/Mobile Navigation - Show simplified nav on medium screens */}
        <nav className="hidden md:flex lg:hidden items-center gap-3">
          <ul className="flex items-center gap-3">
            {navItems.slice(0, 2).map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "text-xs font-medium transition-colors duration-300 hover:text-primary whitespace-nowrap",
                    location.pathname === item.path && "text-primary"
                  )}
                >
                  {t(item.name)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 ml-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-full hover:bg-muted transition-colors duration-200 flex-shrink-0"
                  aria-label="Theme settings"
                >
                  {resolvedTheme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="h-4 w-4 mr-2" />
                  {t('header.theme.light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="h-4 w-4 mr-2" />
                  {t('header.theme.dark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Laptop className="h-4 w-4 mr-2" />
                  {t('header.theme.system')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/auth/login">
              <AnimatedButton variant="ghost" size="sm" className="text-xs px-2">
                {t('header.login')}
              </AnimatedButton>
            </Link>
            <Link to="/auth/register">
              <AnimatedButton variant="default" size="sm" className="text-xs px-2">
                {t('header.signup')}
              </AnimatedButton>
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Button and Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-muted transition-colors duration-200 flex-shrink-0"
                aria-label="Theme settings"
              >
                {resolvedTheme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4 mr-2" />
                {t('header.theme.light')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4 mr-2" />
                {t('header.theme.dark')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="h-4 w-4 mr-2" />
                {t('header.theme.system')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button
            className="p-2 text-foreground flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full glass-effect shadow-md z-50 py-4 md:hidden animate-slide-down">
            <nav className="container px-4">
              <ul className="flex flex-col space-y-4 mb-6">
                {navItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className={cn(
                        "text-sm font-medium block py-2 transition-colors duration-300 hover:text-primary",
                        location.pathname === item.path && "text-primary"
                      )}
                    >
                      {t(item.name)}
                    </Link>
                  </li>
                ))}
              </ul>
              
              <div className="flex flex-col space-y-3">
                <Link to="/auth/login" className="w-full">
                  <AnimatedButton variant="ghost" size="md" fullWidth>
                    {t('header.login')}
                  </AnimatedButton>
                </Link>
                <Link to="/auth/register" className="w-full">
                  <AnimatedButton variant="default" size="md" fullWidth>
                    {t('header.signup')}
                  </AnimatedButton>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
