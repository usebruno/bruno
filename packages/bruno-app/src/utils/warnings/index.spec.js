import {
  doesSubtreeHaveWarnings,
  getActiveWarnings,
  getActiveWarningsForLocation,
  hasActiveWarningsForLocations
} from './index';

describe('doesSubtreeHaveWarnings', () => {
  it('should return true when item has active warnings', () => {
    const item = {
      warnings: [{ ruleId: 'untranslated-pm-api', message: 'test' }]
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(true);
  });

  it('should return false when item has no warnings', () => {
    const item = {};
    expect(doesSubtreeHaveWarnings(item)).toBe(false);
  });

  it('should return false when all warnings are dismissed', () => {
    const item = {
      warnings: [{ ruleId: 'untranslated-pm-api', message: 'test' }],
      dismissedWarningRules: ['untranslated-pm-api']
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(false);
  });

  it('should return false when warnings are dismissed via composite key', () => {
    const item = {
      warnings: [{ ruleId: 'untranslated-pm-api', location: 'pre-request-script', message: 'test' }],
      dismissedWarningRules: ['untranslated-pm-api:pre-request-script']
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(false);
  });

  it('should return true when a descendant has active warnings', () => {
    const item = {
      items: [
        {
          items: [
            {
              warnings: [{ ruleId: 'untranslated-pm-api', message: 'deep' }]
            }
          ]
        }
      ]
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(true);
  });

  it('should return false when descendant warnings are dismissed', () => {
    const item = {
      items: [
        {
          warnings: [{ ruleId: 'untranslated-pm-api', message: 'test' }],
          dismissedWarningRules: ['untranslated-pm-api']
        }
      ]
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(false);
  });

  it('should handle mixed dismissed and active warnings', () => {
    const item = {
      warnings: [
        { ruleId: 'rule-a', message: 'a' },
        { ruleId: 'rule-b', message: 'b' }
      ],
      dismissedWarningRules: ['rule-a']
    };
    expect(doesSubtreeHaveWarnings(item)).toBe(true);
  });
});

describe('getActiveWarnings', () => {
  it('should return all warnings when none dismissed', () => {
    const item = {
      warnings: [
        { ruleId: 'rule-a', message: 'a' },
        { ruleId: 'rule-b', message: 'b' }
      ]
    };
    expect(getActiveWarnings(item)).toEqual(item.warnings);
  });

  it('should filter out dismissed warnings by plain ruleId', () => {
    const item = {
      warnings: [
        { ruleId: 'rule-a', message: 'a' },
        { ruleId: 'rule-b', message: 'b' }
      ],
      dismissedWarningRules: ['rule-a']
    };
    const active = getActiveWarnings(item);
    expect(active.length).toBe(1);
    expect(active[0].ruleId).toBe('rule-b');
  });

  it('should filter out dismissed warnings by composite key', () => {
    const item = {
      warnings: [
        { ruleId: 'rule-a', location: 'pre-request-script', message: 'a' },
        { ruleId: 'rule-a', location: 'tests', message: 'b' }
      ],
      dismissedWarningRules: ['rule-a:pre-request-script']
    };
    const active = getActiveWarnings(item);
    expect(active.length).toBe(1);
    expect(active[0].location).toBe('tests');
  });

  it('should dismiss all locations when plain ruleId is used (blanket dismiss)', () => {
    const item = {
      warnings: [
        { ruleId: 'rule-a', location: 'pre-request-script', message: 'a' },
        { ruleId: 'rule-a', location: 'tests', message: 'b' }
      ],
      dismissedWarningRules: ['rule-a']
    };
    const active = getActiveWarnings(item);
    expect(active.length).toBe(0);
  });

  it('should return empty array for item with no warnings', () => {
    expect(getActiveWarnings({})).toEqual([]);
    expect(getActiveWarnings({ warnings: [] })).toEqual([]);
  });
});

describe('getActiveWarningsForLocation', () => {
  const item = {
    warnings: [
      { ruleId: 'rule-a', location: 'pre-request-script', message: 'a' },
      { ruleId: 'rule-a', location: 'post-response-script', message: 'b' },
      { ruleId: 'rule-a', location: 'tests', message: 'c' }
    ]
  };

  it('should return only warnings for the given location', () => {
    const result = getActiveWarningsForLocation(item, 'pre-request-script');
    expect(result.length).toBe(1);
    expect(result[0].message).toBe('a');
  });

  it('should return empty array for location with no warnings', () => {
    const result = getActiveWarningsForLocation(item, 'nonexistent');
    expect(result).toEqual([]);
  });

  it('should respect dismissals', () => {
    const dismissed = {
      ...item,
      dismissedWarningRules: ['rule-a:pre-request-script']
    };
    const result = getActiveWarningsForLocation(dismissed, 'pre-request-script');
    expect(result).toEqual([]);
  });
});

describe('hasActiveWarningsForLocations', () => {
  const item = {
    warnings: [
      { ruleId: 'rule-a', location: 'pre-request-script', message: 'a' },
      { ruleId: 'rule-a', location: 'tests', message: 'b' }
    ]
  };

  it('should return true when any of the locations has warnings', () => {
    expect(hasActiveWarningsForLocations(item, ['pre-request-script', 'post-response-script'])).toBe(true);
  });

  it('should return false when none of the locations has warnings', () => {
    expect(hasActiveWarningsForLocations(item, ['post-response-script'])).toBe(false);
  });

  it('should return false when all matching warnings are dismissed', () => {
    const dismissed = {
      ...item,
      dismissedWarningRules: ['rule-a:pre-request-script']
    };
    expect(hasActiveWarningsForLocations(dismissed, ['pre-request-script'])).toBe(false);
    expect(hasActiveWarningsForLocations(dismissed, ['tests'])).toBe(true);
  });

  it('should return false for items with no warnings', () => {
    expect(hasActiveWarningsForLocations({}, ['pre-request-script'])).toBe(false);
  });
});
