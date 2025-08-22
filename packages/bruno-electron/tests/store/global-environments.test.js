const { globalEnvironmentsStore } = require('../../src/store/global-environments');

// Previously, a bug caused environment variables to be saved without a type.
// Since that issue is now fixed, this code ensures that anyone who imported
// data before the fix will have the missing types added retroactively.
describe('Global Environment Backward Compatibility', () => {
  beforeEach(() => {
    globalEnvironmentsStore.store.clear();
  });

  it('should add type field for existing global environments without type', () => {
    // Mock global environments without type field
    const mockGlobalEnvironments = [
      {
        uid: "env-1",
        name: "Test Environment",
        variables: [
          {
            uid: "var-1",
            name: "regular_var",
            value: "regular_value",
            enabled: true,
            secret: false
            // Missing: type field
          },
          {
            uid: "var-2", 
            name: "secret_var",
            value: "secret_value",
            enabled: true,
            secret: true
            // Missing: type field
          }
        ]
      }
    ];

    globalEnvironmentsStore.store.set('environments', mockGlobalEnvironments);

    const processedEnvironments = globalEnvironmentsStore.getGlobalEnvironments();

    expect(processedEnvironments).toHaveLength(1);
    expect(processedEnvironments[0].variables).toHaveLength(2);

    const regularVar = processedEnvironments[0].variables.find(v => v.name === 'regular_var');
    const secretVar = processedEnvironments[0].variables.find(v => v.name === 'secret_var');

    expect(regularVar.name).toBe('regular_var');
    expect(regularVar.type).toBe('text');

    expect(secretVar.name).toBe('secret_var');
    expect(secretVar.type).toBe('text');
  });
});
