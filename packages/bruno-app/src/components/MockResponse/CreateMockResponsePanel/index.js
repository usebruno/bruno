import React, { useEffect, useMemo, useState } from 'react';
import { IconPlus } from '@tabler/icons';
import Button from 'ui/Button';
import statusCodePhraseMap from 'components/ResponsePane/StatusCode/get-status-code-phrase';
import { collectCollectionExamples } from 'utils/mock-responses';
import StyledWrapper from './StyledWrapper';

const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
const BODY_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' }
];

const formatStatusOption = (code) => {
  const phrase = statusCodePhraseMap[code];
  return phrase ? `${code} ${phrase}` : String(code);
};

const CreateMockResponseForm = ({
  collection,
  onCreate,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [statusCode, setStatusCode] = useState(200);
  const [bodyType, setBodyType] = useState('json');
  const [nameError, setNameError] = useState('');
  const [useExample, setUseExample] = useState(false);
  const [selectedExampleKey, setSelectedExampleKey] = useState('');

  const examples = useMemo(() => {
    if (!collection) {
      return [];
    }

    return collectCollectionExamples(collection);
  }, [collection]);

  const selectedExample = useMemo(() => {
    if (!selectedExampleKey) {
      return null;
    }

    return examples.find(({ item, example }) => `${item.uid}:${example.uid}` === selectedExampleKey) || null;
  }, [examples, selectedExampleKey]);

  useEffect(() => {
    if (!useExample || !selectedExample) {
      return;
    }

    if (!name.trim()) {
      setName(selectedExample.example.name || '');
    }

    const exampleStatus = Number(selectedExample.example.response?.status);
    if (exampleStatus) {
      setStatusCode(exampleStatus);
    }

    if (selectedExample.example.response?.body?.type) {
      setBodyType(selectedExample.example.response.body.type);
    }
  }, [useExample, selectedExample, name]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setStatusCode(200);
    setBodyType('json');
    setNameError('');
    setUseExample(false);
    setSelectedExampleKey('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError('Mock response name is required');
      return;
    }

    if (useExample && !selectedExample) {
      setNameError('Select a collection example');
      return;
    }

    onCreate({
      name: name.trim(),
      description: description.trim(),
      statusCode: Number(statusCode),
      bodyType,
      exampleSelection: useExample ? selectedExample : null
    });
    resetForm();
  };

  return (
    <StyledWrapper className="create-form">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="mock-response-create-name" className="field-label">
            Name<span className="text-red-600">*</span>
          </label>
          <input
            id="mock-response-create-name"
            type="text"
            className="mock-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) {
                setNameError('');
              }
            }}
            placeholder="Mock response name"
            data-testid="mock-response-create-name-input"
          />
          {nameError ? (
            <div className="field-error">{nameError}</div>
          ) : null}
        </div>

        <div>
          <label htmlFor="mock-response-create-description" className="field-label">
            Description
          </label>
          <textarea
            id="mock-response-create-description"
            className="mock-input mock-input-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
            data-testid="mock-response-create-description-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="mock-response-create-status" className="field-label">
              Status Code
            </label>
            <select
              id="mock-response-create-status"
              className="mock-select"
              value={statusCode}
              onChange={(event) => setStatusCode(event.target.value)}
              disabled={useExample}
            >
              {STATUS_CODES.map((code) => (
                <option key={code} value={code}>{formatStatusOption(code)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mock-response-create-body-type" className="field-label">
              Body Type
            </label>
            <select
              id="mock-response-create-body-type"
              className="mock-select"
              value={bodyType}
              onChange={(event) => setBodyType(event.target.value)}
              disabled={useExample}
            >
              {BODY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {collection && examples.length > 0 ? (
          <div className="example-section">
            <label className="example-toggle flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useExample}
                onChange={(event) => {
                  setUseExample(event.target.checked);
                  if (!event.target.checked) {
                    setSelectedExampleKey('');
                  }
                }}
                data-testid="mock-response-use-example-checkbox"
              />
              Use collection example
            </label>

            {useExample ? (
              <select
                className="mock-select mt-2"
                value={selectedExampleKey}
                onChange={(event) => setSelectedExampleKey(event.target.value)}
                data-testid="mock-response-example-select"
              >
                <option value="">Select an example...</option>
                {examples.map(({ item, example }) => (
                  <option key={`${item.uid}-${example.uid}`} value={`${item.uid}:${example.uid}`}>
                    {example.name} ({item.name})
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="filled"
            color="primary"
            size="sm"
            data-testid="mock-response-create-submit-btn"
          >
            Create
          </Button>
          <Button
            type="button"
            variant="outline"
            color="secondary"
            size="sm"
            onClick={() => {
              resetForm();
              onCancel();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </StyledWrapper>
  );
};

const CreateMockResponsePanel = ({ collection, onCreate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`create-panel ${expanded ? 'expanded' : ''}`}>
      {!expanded ? (
        <Button
          variant="outline"
          color="secondary"
          size="sm"
          icon={<IconPlus size={15} stroke={1.75} />}
          onClick={() => setExpanded(true)}
          data-testid="mock-response-create-btn"
        >
          Create Mock Response
        </Button>
      ) : (
        <CreateMockResponseForm
          collection={collection}
          onCreate={(payload) => {
            onCreate(payload);
            setExpanded(false);
          }}
          onCancel={() => setExpanded(false)}
        />
      )}
    </div>
  );
};

export default CreateMockResponsePanel;
