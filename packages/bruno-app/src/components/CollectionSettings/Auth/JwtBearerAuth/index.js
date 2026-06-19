import React, { useCallback, useEffect, useMemo, useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { useDetectSensitiveField } from 'hooks/useDetectSensitiveField';
import { usePersistedState } from 'hooks/usePersistedState';
import { updateCollectionAuth } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import {
  rowsFromPayload,
  payloadFromRows,
  JWT_VALUE_TYPES
} from 'components/RequestPane/Auth/JwtBearerAuth/payloadCodec';
import StyledWrapper from './StyledWrapper';

const JWT_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

const TYPE_LABELS = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  json: 'JSON'
};

const JwtBearerAuth = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const jwtAuth = collection.draft?.root
    ? get(collection, 'draft.root.request.auth.jwtBearer', {})
    : get(collection, 'root.request.auth.jwtBearer', {});

  const algorithm = jwtAuth.algorithm || 'HS256';
  const secret = jwtAuth.secret || '';
  const payload = jwtAuth.payload || '';

  const initial = useMemo(() => rowsFromPayload(payload), [payload]);
  const [rows, setRows] = useState(initial.rows);
  const [parseError, setParseError] = useState(initial.parseError);
  const [showJsonView, setShowJsonView] = useState(false);
  const [columnWidths, setColumnWidths] = usePersistedState({
    key: 'collection-jwt-bearer-payload-column-widths',
    default: {}
  });

  useEffect(() => {
    const localStr = payloadFromRows(rows);
    if (localStr !== payload) {
      const next = rowsFromPayload(payload);
      setRows(next.rows);
      setParseError(next.parseError);
    }
  }, [payload]);

  const { isSensitive } = useDetectSensitiveField(collection);
  const { showWarning, warningMessage } = isSensitive(secret);

  const handleSave = useCallback(() => dispatch(saveCollectionSettings(collection.uid)), [dispatch, collection.uid]);

  const dispatchUpdate = useCallback((next) => {
    dispatch(
      updateCollectionAuth({
        mode: 'jwtBearer',
        collectionUid: collection.uid,
        content: {
          algorithm,
          secret,
          payload,
          ...next
        }
      })
    );
  }, [dispatch, collection.uid, algorithm, secret, payload]);

  const handleRowsChange = useCallback((updated) => {
    setRows(updated);
    dispatchUpdate({ payload: payloadFromRows(updated) });
  }, [dispatchUpdate]);

  const columns = useMemo(() => [
    {
      key: 'key',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '35%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          collection={collection}
          placeholder={!value ? 'Key' : ''}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '45%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          collection={collection}
          placeholder={!value ? 'Value' : ''}
        />
      )
    },
    {
      key: 'type',
      name: 'Type',
      width: '20%',
      render: ({ value, onChange }) => (
        <select
          className="jwt-row-type-select"
          value={value || 'string'}
          onChange={(e) => onChange(e.target.value)}
        >
          {JWT_VALUE_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      )
    }
  ], [storedTheme, handleSave, collection]);

  const defaultRow = { key: '', value: '', type: 'string' };

  const jsonPreview = useMemo(() => payloadFromRows(rows), [rows]);

  return (
    <StyledWrapper className="mt-2 w-full">
      <label className="block mb-1">Algorithm</label>
      <div className="mb-3">
        <select
          className="jwt-algorithm-select"
          value={algorithm}
          onChange={(e) => dispatchUpdate({ algorithm: e.target.value })}
          data-testid="collection-jwt-bearer-algorithm"
        >
          {JWT_ALGORITHMS.map((alg) => (
            <option key={alg} value={alg}>{alg}</option>
          ))}
        </select>
      </div>

      <label className="block mb-1">Secret</label>
      <div className="single-line-editor-wrapper mb-3 flex items-center">
        <SingleLineEditor
          value={secret}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(val) => dispatchUpdate({ secret: val })}
          collection={collection}
          isSecret={true}
          isCompact
        />
        {showWarning && <SensitiveFieldWarning fieldName="collection-jwt-bearer-secret" warningMessage={warningMessage} />}
      </div>

      <div className="flex items-center justify-between mb-1">
        <label className="block">Payload claims</label>
        <button
          type="button"
          className="btn-action text-link select-none text-xs"
          onClick={() => setShowJsonView((v) => !v)}
        >
          {showJsonView ? 'Edit as table' : 'View as JSON'}
        </button>
      </div>

      {parseError && !showJsonView && (
        <div className="payload-parse-error text-xs mb-2" data-testid="collection-jwt-bearer-parse-error">
          Payload couldn’t be parsed as a JSON object ({parseError}). Add a new row to start over, or switch to JSON view to inspect.
        </div>
      )}

      {showJsonView ? (
        <pre className="jwt-payload-json-view" data-testid="collection-jwt-bearer-payload-json-view">{jsonPreview}</pre>
      ) : (
        <div data-testid="collection-jwt-bearer-payload-table">
          <EditableTable
            tableId="collection-jwt-bearer-payload"
            columns={columns}
            rows={rows}
            onChange={handleRowsChange}
            defaultRow={defaultRow}
            reorderable={false}
            showCheckbox={true}
            checkboxKey="enabled"
            columnWidths={columnWidths}
            onColumnWidthsChange={setColumnWidths}
          />
        </div>
      )}
    </StyledWrapper>
  );
};

export default JwtBearerAuth;
