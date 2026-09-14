/**
 * Tests for DropdownMenu UI primitives
 * Targets the `inset` ternary branches in COV-052
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../dropdown-menu';

describe('DropdownMenu primitives', () => {
  describe('DropdownMenuItem (inset branch L87)', () => {
    it('applies inset padding when inset=true', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset data-testid="item-inset">
              Inset item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const item = screen.getByTestId('item-inset');
      expect(item.className).toContain('pl-8');
    });

    it('omits inset padding when inset=false (default)', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem data-testid="item-no-inset">
              Plain item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const item = screen.getByTestId('item-no-inset');
      expect(item.className).not.toContain('pl-8');
    });
  });

  describe('DropdownMenuLabel (inset branch L151)', () => {
    it('applies inset padding when inset=true', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset data-testid="label-inset">
              Inset label
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const label = screen.getByTestId('label-inset');
      expect(label.className).toContain('pl-8');
    });

    it('omits inset padding when inset=false (default)', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel data-testid="label-no-inset">
              Plain label
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const label = screen.getByTestId('label-no-inset');
      expect(label.className).not.toContain('pl-8');
    });
  });

  describe('DropdownMenuSubTrigger (inset branch L29)', () => {
    it('applies inset padding when inset=true', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset data-testid="sub-inset">
                Submenu
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const trigger = screen.getByTestId('sub-inset');
      expect(trigger.className).toContain('pl-8');
      // ChevronRight icon rendered
      expect(trigger.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Other primitives', () => {
    it('DropdownMenuCheckboxItem renders with check icon', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked data-testid="chk">
              Checkable
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const item = screen.getByTestId('chk');
      expect(item.className).toContain('pl-8');
      expect(item.querySelector('svg')).toBeInTheDocument();
    });

    it('DropdownMenuRadioItem renders radio circle', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="a">
              <DropdownMenuRadioItem value="a" data-testid="radio-a">
                A
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const item = screen.getByTestId('radio-a');
      expect(item.className).toContain('pl-8');
    });

    it('DropdownMenuSeparator renders with default classes', () => {
      render(
        <DropdownMenu open>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator data-testid="sep" />
          </DropdownMenuContent>
        </DropdownMenu>
      );
      const sep = screen.getByTestId('sep');
      expect(sep.className).toContain('h-px');
      expect(sep.className).toContain('bg-muted');
    });

    it('DropdownMenuShortcut renders children with ml-auto class', () => {
      render(<DropdownMenuShortcut data-testid="sc">⌘K</DropdownMenuShortcut>);
      const sc = screen.getByTestId('sc');
      expect(sc.className).toContain('ml-auto');
      expect(sc.textContent).toBe('⌘K');
    });

    it('DropdownMenuShortcut merges custom className', () => {
      render(<DropdownMenuShortcut className="custom" data-testid="sc2">⌘P</DropdownMenuShortcut>);
      expect(screen.getByTestId('sc2').className).toContain('custom');
    });
  });
});
