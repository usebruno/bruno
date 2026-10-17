import { useEffect, useRef } from 'react';
import { stripEnvVarUid } from 'utils/environments';
import { reconcileSavedChange, findExternallyAddedVariables } from './reconcile';

/**
 * Reconcile changes coming from outside the form, such as an autosave echo,
 * script update, external file reload, or the "Add to" switcher.
 *
 * - If the form has no unsaved edits, replace its values with the persisted
 *   values.
 * - If the form has unsaved edits, keep the user's changes to prevent async
 *   saves from overwriting text while the user is typing quickly.
 * - Even when the form is dirty, merge variables that were added externally
 *   so those new variables are still shown in the form.
 * @param {Object} params
 * @param {Object} params.formik - The table's Formik instance.
 * @param {string} params.savedValuesJson - Serialized (JSON, uid-stripped, named-rows-only)
 *   snapshot of the currently persisted variables.
 * @param {Array} params.savedVariables - The raw persisted variables (`environment.variables`).
 * @param {Array} params.initialValues - The values to reset the form to when adopting.
 */
export const useReconcileSavedEnvironment = ({ formik, savedValuesJson, savedVariables, initialValues }) => {
  const prevSavedValuesJsonRef = useRef(savedValuesJson);
  const prevRawSavedRef = useRef(savedVariables);

  useEffect(() => {
    const prevSaved = prevSavedValuesJsonRef.current;
    const prevRawSaved = prevRawSavedRef.current;
    prevSavedValuesJsonRef.current = savedValuesJson;
    prevRawSavedRef.current = savedVariables;

    const currentNamed = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const currentJson = JSON.stringify(currentNamed.map(stripEnvVarUid));

    const outcome = reconcileSavedChange({ prevSaved, nextSaved: savedValuesJson, current: currentJson });

    if (outcome === 'adopt') {
      formik.resetForm({ values: initialValues });
      return;
    }

    if (outcome === 'skip') {
      const added = findExternallyAddedVariables({
        prevRawSaved,
        nextRawSaved: savedVariables,
        currentValues: formik.values
      });

      if (added.length > 0) {
        const values = formik.values;
        const trailingRow = values[values.length - 1];
        const restRows = values.slice(0, -1);
        formik.setValues([
          ...restRows,
          ...added.map((v) => ({ ...v, description: v.description ?? '' })),
          trailingRow
        ]);
      }
    }
  }, [savedValuesJson]);
};
