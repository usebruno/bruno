import { renderHook } from '@testing-library/react';
import { useReconcileSavedEnvironment } from './useReconcileSavedEnvironment';
import { stripEnvVarUid } from 'utils/environments';

const toSavedJson = (vars) => JSON.stringify(vars.map(stripEnvVarUid));

describe('useReconcileSavedEnvironment', () => {
  it('adopts the incoming snapshot when the form has no unsaved edits', () => {
    const savedA = [{ uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true, secret: false }];
    const formik = {
      values: [{ uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true, secret: false }],
      resetForm: jest.fn(),
      setValues: jest.fn()
    };
    const initialValues = [{ uid: 'new', name: '', value: '', type: 'text', enabled: true, secret: false }];

    const { rerender } = renderHook(
      ({ savedValuesJson, savedVariables }) => useReconcileSavedEnvironment({ formik, savedValuesJson, savedVariables, initialValues }),
      { initialProps: { savedValuesJson: toSavedJson(savedA), savedVariables: savedA } }
    );

    expect(formik.resetForm).not.toHaveBeenCalled();

    // Saved snapshot changes externally (e.g. file reload) while the form still matches the old baseline.
    const savedB = [{ uid: 'u2', name: 'a', value: '2', type: 'text', enabled: true, secret: false }];
    rerender({ savedValuesJson: toSavedJson(savedB), savedVariables: savedB });

    expect(formik.resetForm).toHaveBeenCalledWith({ values: initialValues });
    expect(formik.setValues).not.toHaveBeenCalled();
  });

  it('merges in externally added variables while keeping unsaved edits, without touching the trailing empty row', () => {
    const savedA = [{ uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true, secret: false }];
    const trailingRow = { uid: 'trailing', name: '', value: '', type: 'text', enabled: true, secret: false };
    const formik = {
      // User has an unsaved edit to "a" (value 999) from the very start.
      values: [{ uid: 'u1', name: 'a', value: '999', type: 'text', enabled: true, secret: false }, trailingRow],
      resetForm: jest.fn(),
      setValues: jest.fn()
    };
    const initialValues = [];

    const { rerender } = renderHook(
      ({ savedValuesJson, savedVariables }) => useReconcileSavedEnvironment({ formik, savedValuesJson, savedVariables, initialValues }),
      { initialProps: { savedValuesJson: toSavedJson(savedA), savedVariables: savedA } }
    );

    // A new variable "b" is added externally (e.g. the undefined-variable tooltip's "Add to" switcher)
    // while the form is still dirty from the user's edit to "a".
    const savedB = [
      { uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true, secret: false },
      { uid: 'u2', name: 'b', value: '2', type: 'text', enabled: true, secret: false }
    ];
    rerender({ savedValuesJson: toSavedJson(savedB), savedVariables: savedB });

    expect(formik.resetForm).not.toHaveBeenCalled();
    expect(formik.setValues).toHaveBeenCalledWith([
      { uid: 'u1', name: 'a', value: '999', type: 'text', enabled: true, secret: false },
      { uid: 'u2', name: 'b', value: '2', type: 'text', enabled: true, secret: false, description: '' },
      trailingRow
    ]);
  });

  it('does nothing when the form already matches the incoming snapshot (its own save landing)', () => {
    const savedA = [{ uid: 'u1', name: 'a', value: '1', type: 'text', enabled: true, secret: false }];
    const formik = {
      values: savedA,
      resetForm: jest.fn(),
      setValues: jest.fn()
    };
    const initialValues = [];

    const { rerender } = renderHook(
      ({ savedValuesJson, savedVariables }) => useReconcileSavedEnvironment({ formik, savedValuesJson, savedVariables, initialValues }),
      { initialProps: { savedValuesJson: toSavedJson(savedA), savedVariables: savedA } }
    );

    const savedB = [{ uid: 'u1', name: 'a', value: '2', type: 'text', enabled: true, secret: false }];
    // Simulate the form having already been reset to match the new snapshot (e.g. by handleSave itself).
    formik.values = savedB;
    rerender({ savedValuesJson: toSavedJson(savedB), savedVariables: savedB });

    expect(formik.resetForm).not.toHaveBeenCalled();
    expect(formik.setValues).not.toHaveBeenCalled();
  });
});
