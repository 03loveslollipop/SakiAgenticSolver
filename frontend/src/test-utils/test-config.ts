// test-config.ts - Property-Based Testing Configuration
import fc from 'fast-check';

export const propertyTestConfig = {
  numRuns: 100,
  verbose: true,
  seed: Date.now(),
};

export const runPropertyTest = <T>(
  propertyNumber: number,
  propertyDescription: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void
) => {
  it(`Feature: frontend-ui-8bit-redesign, Property ${propertyNumber}: ${propertyDescription}`, () => {
    fc.assert(
      fc.property(arbitrary, predicate),
      propertyTestConfig
    );
  });
};
