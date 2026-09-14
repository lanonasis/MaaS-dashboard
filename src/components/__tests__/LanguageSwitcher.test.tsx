/**
 * Tests for LanguageSwitcher component
 *
 * Covers branch lines:
 * - 25 (i18n fallback — i18n.language is falsy → defaults to 'en')
 * - 26 (i18n fallback — languages.find returns undefined → defaults to languages[0])
 * - 58 (localStorage write on language change)
 * - 61 (close on select — dropdown closes after selecting a language)
 */

import { beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockChangeLanguage = vi.fn();

// ---------------------------------------------------------------------------
// Test fixtures via dynamic import — each test group controls its own mock
// ---------------------------------------------------------------------------

async function loadLanguageSwitcher(
  lang: string | null | undefined,
  changeLangFn = mockChangeLanguage,
) {
  // Reset modules so the new mock takes effect
  vi.resetModules();

  vi.doMock('react-i18next', () => ({
    useTranslation: () => ({
      i18n: {
        language: lang,
        changeLanguage: changeLangFn,
      },
      t: (key: string) => key,
    }),
  }));

  const { LanguageSwitcher } = await import('../LanguageSwitcher');
  return LanguageSwitcher;
}

// ---------------------------------------------------------------------------
// Baseline render tests — i18n.language = 'en' (truthy, matches)
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

describe('LanguageSwitcher', () => {
  it('renders the language selector button', async () => {
    const LanguageSwitcher = await loadLanguageSwitcher('en');
    render(<LanguageSwitcher />);
    expect(screen.getByTestId('language-selector-button')).toBeInTheDocument();
  });

  it('displays the current language name', async () => {
    const LanguageSwitcher = await loadLanguageSwitcher('en');
    render(<LanguageSwitcher />);
    expect(screen.getByTestId('language-current-name')).toHaveTextContent('English');
  });

  it('shows the current language code as data attribute', async () => {
    const LanguageSwitcher = await loadLanguageSwitcher('en');
    render(<LanguageSwitcher />);
    const button = screen.getByTestId('language-selector-button');
    expect(button).toHaveAttribute('data-language', 'en');
  });

  // ---------------------------------------------------------------------------
  // Branch line 25: i18n.language is falsy → || 'en' fallback
  // ---------------------------------------------------------------------------
  describe('i18n.language falsy fallback (branch line 25)', () => {
    it('defaults to English when i18n.language is null', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher(null);
      render(<LanguageSwitcher />);
      expect(screen.getByTestId('language-selector-button')).toHaveAttribute('data-language', 'en');
    });

    it('defaults to English when i18n.language is undefined', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher(undefined);
      render(<LanguageSwitcher />);
      expect(screen.getByTestId('language-selector-button')).toHaveAttribute('data-language', 'en');
    });

    it('defaults to English when i18n.language is empty string', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('');
      render(<LanguageSwitcher />);
      expect(screen.getByTestId('language-selector-button')).toHaveAttribute('data-language', 'en');
    });
  });

  // ---------------------------------------------------------------------------
  // Branch line 26: languages.find() returns undefined → || languages[0] fallback
  // ---------------------------------------------------------------------------
  describe('find fallback (branch line 26)', () => {
    it('falls back to languages[0] when activeCode does not match any language', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('xx');
      render(<LanguageSwitcher />);
      expect(screen.getByTestId('language-selector-button')).toHaveAttribute('data-language', 'en');
    });

    it('falls back when i18n.language is a locale like "xx-YY" not in the list', async () => {
      // 'xx' (after split) is not in languages, so find() returns undefined → languages[0]
      const LanguageSwitcher = await loadLanguageSwitcher('xx-YY');
      render(<LanguageSwitcher />);
      expect(screen.getByTestId('language-selector-button')).toHaveAttribute('data-language', 'en');
    });
  });

  // ---------------------------------------------------------------------------
  // Branch line 61: close on select — dropdown closes after selecting a language
  // ---------------------------------------------------------------------------
  describe('dropdown interaction', () => {
    it('opens the dropdown on button click', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes the dropdown when a language option is selected (branch line 61)', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);

      // Click the Spanish option
      const spanishOption = screen.getByRole('option', { name: /Español/i });
      fireEvent.click(spanishOption);

      // The dropdown should be gone after selection (isOpen becomes false)
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });

      // Verify the language changed
      expect(mockChangeLanguage).toHaveBeenCalledWith('es');
    });

    // ---------------------------------------------------------------------------
    // Branch line 58: localStorage write on language change
    // ---------------------------------------------------------------------------
    it('writes to localStorage when a language is selected (branch line 58)', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);

      const frenchOption = screen.getByRole('option', { name: /Français/i });
      fireEvent.click(frenchOption);

      expect(localStorage.setItem).toHaveBeenCalledWith('i18nextLng', 'fr');
    });

    it('closes the dropdown when clicking outside (backdrop)', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Click the backdrop
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('closes the dropdown when clicking the button again', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('renders all language options', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);

      // Should have 11 language options
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(11);
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------
  describe('accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const LanguageSwitcher = await loadLanguageSwitcher('en');
      render(<LanguageSwitcher />);
      const button = screen.getByTestId('language-selector-button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-label', 'Select Language');
    });
  });
});
