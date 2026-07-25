import { describe, expect, it } from 'vitest';
import {
  applyConsumerTag,
  resolveConsumer,
  type KeyConsumer,
} from '../api-key-consumer';

describe('API key consumer metadata', () => {
  it('prefers explicit consumer metadata over binding and legacy names', () => {
    expect(resolveConsumer({
      consumer: 'claude',
      binding: { client_id: 'hermes' },
      name: '[openclaw] Legacy key',
    })).toBe('claude');
  });

  it('prefers binding metadata over a legacy name tag', () => {
    expect(resolveConsumer({
      binding: { client_id: 'hermes' },
      name: '[claude] Legacy key',
    })).toBe('hermes');
  });

  it('normalizes legacy name tags case-insensitively', () => {
    expect(resolveConsumer({ name: '[OpenClaw] Legacy key' })).toBe('openclaw');
  });

  it.each<KeyConsumer>(['claude', 'hermes', 'openclaw'])(
    'formats a %s consumer tag',
    (consumer) => {
      expect(applyConsumerTag('[Claude] My key', consumer))
        .toBe(`[${consumer}] My key`);
    },
  );

  it('removes legacy tags when a key is unbound', () => {
    expect(applyConsumerTag('[HeRmEs] My key', 'unbound')).toBe('My key');
  });
});
