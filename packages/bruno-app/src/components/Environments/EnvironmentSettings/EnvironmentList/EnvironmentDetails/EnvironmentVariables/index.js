import React, { useMemo, useCallback } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { get } from 'lodash';
import { useDispatch } from 'react-redux';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { setEnvironmentsDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { flattenItems, isItemARequest } from 'utils/collections';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import EnvironmentVariablesTable from 'components/EnvironmentVariablesTable';
import { sensitiveFields } from './constants';

const EnvironmentVariables = ({ environment, setIsModified, collection, searchQuery = '' }) => {
  const dispatch = useDispatch();

  const environmentsDraft = collection?.environmentsDraft;
  const hasDraftForThisEnv = environmentsDraft?.environmentUid === environment.uid;

  // Check for non-secret variables used in sensitive fields
  const nonSecretSensitiveVarUsageMap = useMemo(() => {
    const result = {};
    if (!collection || !environment?.variables) {
      return result;
    }
    const nonSecretVars = environment.variables.filter((v) => v.enabled && !v.secret && v.name);
    if (!nonSecretVars.length) {
      return result;
    }
    const varNames = new Set(nonSecretVars.map((v) => v.name));

    const checkSensitiveField = (obj, fieldPath) => {
      const value = get(obj, fieldPath);
      if (typeof value === 'string') {
        varNames.forEach((varName) => {
          if (new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`).test(value)) {
            result[varName] = true;
          }
        });
      }
    };

    const getObjectToProcess = (item) => {
      if (isItemARequest(item)) {
        return item.draft || item;
      }
      return item.root;
    };

    const collectionObj = getObjectToProcess(collection);
    sensitiveFields.forEach((fieldPath) => {
      checkSensitiveField(collectionObj, fieldPath);
    });

    const items = flattenItems(collection.items || []);
    items.forEach((item) => {
      const objToProcess = getObjectToProcess(item);
      sensitiveFields.forEach((fieldPath) => {
        checkSensitiveField(objToProcess, fieldPath);
      });
    });
    return result;
  }, [collection, environment]);

  const hasSensitiveUsage = useCallback((name) => !!nonSecretSensitiveVarUsageMap[name], [nonSecretSensitiveVarUsageMap]);

  const handleSave = useCallback(
    (variables) => {
      return dispatch(saveEnvironment(cloneDeep(variables), environment.uid, collection.uid));
    },
    [dispatch, environment.uid, collection.uid]
  );

  const handleDraftChange = useCallback(
    (variables) => {
      dispatch(
        setEnvironmentsDraft({
          collectionUid: collection.uid,
          environmentUid: environment.uid,
          variables
        })
      );
    },
    [dispatch, collection.uid, environment.uid]
  );

  const handleDraftClear = useCallback(() => {
    dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
  }, [dispatch, collection.uid]);

  const renderExtraValueContent = useCallback(
    (variable) => {
      if (!variable.secret && hasSensitiveUsage(variable.name)) {
        return (
          <SensitiveFieldWarning
            fieldName={variable.name}
            warningMessage="This variable is used in sensitive fields. Mark it as a secret for security"
          />
        );
      }
      return null;
    },
    [hasSensitiveUsage]
  );

  return (
    <EnvironmentVariablesTable
      environment={environment}
      collection={collection}
      onSave={handleSave}
      draft={hasDraftForThisEnv ? environmentsDraft : null}
      onDraftChange={handleDraftChange}
      onDraftClear={handleDraftClear}
      setIsModified={setIsModified}
      renderExtraValueContent={renderExtraValueContent}
      searchQuery={searchQuery}
    />
  );
};

export default EnvironmentVariables;
