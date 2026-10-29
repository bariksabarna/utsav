/**
 * Automated accessibility smoke test.
 *
 * FR IDs: FR-A11Y-001, FR-A11Y-003.
 */

import axe from 'axe-core';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('accessibility', () => {
  it('has no detectable axe violations in the default plan', async () => {
    const { container } = render(<App />);
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(results.violations).toEqual([]);
  });
});
