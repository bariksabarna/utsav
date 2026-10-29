/**
 * Translation coverage smoke tests.
 *
 * FR IDs: FR-I18N-001, FR-I18N-002.
 */

import { describe, expect, it } from 'vitest';
import { english, makeTranslator } from '../src/i18n';
import hi from '../src/i18n.hi';
import bn from '../src/i18n.bn';

describe('translations', () => {
  it('returns every English key', () => {
    const t = makeTranslator(english);
    for (const key of Object.keys(english) as Array<keyof typeof english>) {
      expect(t(key).length).toBeGreaterThan(0);
    }
  });

  it('loads complete Hindi and Bengali dictionaries', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(english).sort());
    expect(Object.keys(bn).sort()).toEqual(Object.keys(english).sort());
    expect(hi.heroTitle).not.toBe(english.heroTitle);
    expect(bn.heroTitle).not.toBe(english.heroTitle);
  });
});
