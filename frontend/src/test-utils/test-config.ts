// test-config.ts - Property-Based Testing Configuration
import fc from 'fast-check';
import { cleanup } from '@testing-library/react';

export const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now(),
};

export const runPropertyTest = <T>(
  propertyNumber: number,
  propertyDescription: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void | Promise<boolean | void>
) => {
  it(`Feature: frontend-ui-8bit-redesign, Property ${propertyNumber}: ${propertyDescription}`, async () => {
    await fc.assert(
      fc.asyncProperty(arbitrary, async (value) => {
        // Property tests run multiple cases within a single Jest test.
        // Ensure each case starts from a clean DOM to avoid render accumulation.
        cleanup();
        try {
          return await predicate(value);
        } finally {
          cleanup();
        }
      }),
      propertyTestConfig
    );
  }, 30_000);
};
