import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './auth';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  it('collapses Gmail dot/·+tag variants to one address', () => {
    expect(normalizeEmail('andd.hong@gmail.com')).toBe('anddhong@gmail.com');
    expect(normalizeEmail('anddhong@gmail.com')).toBe('anddhong@gmail.com');
    expect(normalizeEmail('a.n.d.d.hong+journal@gmail.com')).toBe('anddhong@gmail.com');
    expect(normalizeEmail('foo@googlemail.com')).toBe('foo@gmail.com');
  });

  it('leaves non-Gmail addresses (including dots) intact', () => {
    expect(normalizeEmail('first.last@work.com')).toBe('first.last@work.com');
  });
});
