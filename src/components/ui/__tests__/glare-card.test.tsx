/**
 * Tests for GlareCard component
 *
 * Covers branch line 21 (handleMouseMove early-return when ref is null).
 */

import { describe, it, expect, vi } from 'vitest';

describe('GlareCard', () => {
  it('renders its children', async () => {
    vi.resetModules();
    const { render, screen } = await import('@testing-library/react');
    const { GlareCard } = await import('../glare-card');
    render(
      <GlareCard>
        <span data-testid="child">Hello</span>
      </GlareCard>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies default className', async () => {
    vi.resetModules();
    const { render } = await import('@testing-library/react');
    const { GlareCard } = await import('../glare-card');
    const { container } = render(<GlareCard>Content</GlareCard>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('group');
    expect(div).toHaveClass('relative');
    expect(div).toHaveClass('overflow-hidden');
  });

  it('merges custom className with defaults', async () => {
    vi.resetModules();
    const { render } = await import('@testing-library/react');
    const { GlareCard } = await import('../glare-card');
    const { container } = render(<GlareCard className="my-custom-class">Content</GlareCard>);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveClass('my-custom-class');
    expect(div).toHaveClass('group');
  });

  // ---------------------------------------------------------------------------
  // Branch line 21: handleMouseMove early-return (node is null)
  // ---------------------------------------------------------------------------
  describe('mouse tracking (branch line 21)', () => {
    it('sets CSS variables on mouse move (real ref)', async () => {
      vi.resetModules();
      const { render, fireEvent } = await import('@testing-library/react');
      const { GlareCard } = await import('../glare-card');
      const { container } = render(<GlareCard><span>Card</span></GlareCard>);
      const div = container.firstChild as HTMLElement;

      fireEvent.mouseMove(div, { clientX: 100, clientY: 50 });

      expect(div.style.getPropertyValue('--mouse-x')).toBeTruthy();
      expect(div.style.getPropertyValue('--mouse-y')).toBeTruthy();
    });

    it('returns early when ref.current is null (line 21)', async () => {
      vi.resetModules();

      // Build a ref where `current` is always null — setter is a no-op so
      // React's render-phase assignment is silently swallowed, and the getter
      // always returns null.  handleMouseMove therefore hits the guard at
      // line 21 (`if (!node) return;`).
      const nullRef: { current: HTMLDivElement | null } = {} as any;
      Object.defineProperty(nullRef, 'current', {
        get: () => null,
        set: () => {},
        configurable: false,
      });

      vi.doMock('react', async () => {
        const realReact = await vi.importActual('react');
        return {
          ...realReact,
          useRef: () => nullRef,
        };
      });

      const { render, fireEvent } = await import('@testing-library/react');
      const { GlareCard } = await import('../glare-card');

      const { container } = render(
        <GlareCard>
          <div>Content</div>
        </GlareCard>,
      );
      const div = container.firstChild as HTMLElement;

      // Initial CSS vars should be defaults (50%)
      expect(div.style.getPropertyValue('--mouse-x')).toBe('50%');

      // handleMouseMove reads containerRef.current (null), returns early at line 21
      // So --mouse-x should remain at initial value
      fireEvent.mouseMove(div, { clientX: 50, clientY: 50 });
      expect(div.style.getPropertyValue('--mouse-x')).toBe('50%');
    });
  });

  // ---------------------------------------------------------------------------
  // Hover state (glare overlay)
  // ---------------------------------------------------------------------------
  describe('hover', () => {
    it('adds hover classes on mouse enter', async () => {
      vi.resetModules();
      const { render, fireEvent } = await import('@testing-library/react');
      const { GlareCard } = await import('../glare-card');
      const { container } = render(<GlareCard>Content</GlareCard>);
      const div = container.firstChild as HTMLElement;

      fireEvent.mouseEnter(div);
      expect(div).toHaveClass('hover:ring-2');
    });
  });

  it('has correct display name', async () => {
    vi.resetModules();
    const { GlareCard } = await import('../glare-card');
    expect(GlareCard.displayName).toBe('GlareCard');
  });
});
