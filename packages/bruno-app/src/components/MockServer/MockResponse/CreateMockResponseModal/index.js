import React, { useEffect, useMemo, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import statusCodePhraseMap from 'components/ResponsePane/StatusCode/get-status-code-phrase';
import {
  collectCollectionExamples,
  buildMockResponseNameSchema,
  mockResponseDescriptionSchema
} from 'utils/mock-server/mock-responses';

const BODY_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' }
];

const CreateMockResponseModal = ({ collection, existingResponses = [], onCreate, onClose }) => {
  const nameInputRef = useRef();

  const examples = useMemo(() => (
    collection ? collectCollectionExamples(collection) : []
  ), [collection]);

  const findExample = (key) => (
    examples.find(({ item, example }) => `${item.uid}:${example.uid}` === key) || null
  );

  const formik = useFormik({
    validateOnMount: true,
    initialValues: {
      name: '',
      description: '',
      statusCode: 200,
      bodyType: 'json',
      useExample: false,
      selectedExampleKey: ''
    },
    validationSchema: Yup.object({
      name: buildMockResponseNameSchema({ existingResponses }),
      description: mockResponseDescriptionSchema,
      selectedExampleKey: Yup.string().when('useExample', {
        is: true,
        then: (schema) => schema.required('Select a collection example')
      })
    }),
    onSubmit: async (values, { setStatus }) => {
      setStatus(null);
      try {
        await onCreate({
          name: values.name.trim(),
          description: values.description.trim(),
          statusCode: Number(values.statusCode) || 200,
          bodyType: values.bodyType,
          exampleSelection: values.useExample ? findExample(values.selectedExampleKey) : null
        });
        onClose();
      } catch (err) {
        setStatus(err.message || 'Failed to create mock response');
      }
    }
  });

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  const handleExampleChange = (event) => {
    const key = event.target.value;
    const selected = findExample(key);

    if (!selected) {
      formik.setFieldValue('selectedExampleKey', key);
      return;
    }

    formik.setTouched({ ...formik.touched, name: true }, false);
    formik.setValues({
      ...formik.values,
      selectedExampleKey: key,
      name: selected.example.name || '',
      statusCode: Number(selected.example.response?.status) || 200,
      bodyType: selected.example.response?.body?.type || 'json'
    });
  };

  const handleUseExampleChange = (event) => {
    const { checked } = event.target;

    formik.setValues({
      ...formik.values,
      useExample: checked,
      selectedExampleKey: ''
    });
  };

  const isExampleLinked = formik.values.useExample && Boolean(findExample(formik.values.selectedExampleKey));

  const handleFieldChange = (event) => {
    formik.setStatus(null);
    formik.setFieldTouched(event.target.name, true, false);
    formik.handleChange(event);
  };

  const nameError = (formik.touched.name && formik.errors.name) || formik.status || null;

  return (
    <Portal>
      <Modal
        size="md"
        title="Create Mock Response"
        confirmText={formik.isSubmitting ? 'Creating...' : 'Create'}
        confirmDisabled={formik.isSubmitting || !formik.isValid || !formik.values.name.trim()}
        handleConfirm={() => formik.handleSubmit()}
        handleCancel={() => {
          if (!formik.isSubmitting) {
            onClose();
          }
        }}
        dataTestId="create-mock-response-modal"
      >
        <form className="bruno-form" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="mock-response-create-name" className="block font-medium">
              Name
            </label>
            <input
              id="mock-response-create-name"
              name="name"
              type="text"
              ref={nameInputRef}
              className="block textbox w-full mt-2"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={formik.values.name}
              onChange={handleFieldChange}
              onBlur={formik.handleBlur}
              data-testid="mock-response-create-name-input"
            />
            {nameError ? (
              <div className="text-red-500 mt-1">{nameError}</div>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="mock-response-create-description" className="block font-medium">
              Description
            </label>
            <textarea
              id="mock-response-create-description"
              name="description"
              className="block textbox w-full mt-2"
              rows={2}
              value={formik.values.description}
              onChange={handleFieldChange}
              onBlur={formik.handleBlur}
              data-testid="mock-response-create-description-input"
            />
            {formik.touched.description && formik.errors.description ? (
              <div className="text-red-500 mt-1">{formik.errors.description}</div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mock-response-create-status" className="block font-medium">
                Status Code
              </label>
              <select
                id="mock-response-create-status"
                name="statusCode"
                className="textbox w-full mt-2"
                value={formik.values.statusCode}
                onChange={formik.handleChange}
                disabled={isExampleLinked}
                data-testid="mock-response-create-status-input"
              >
                {Object.entries(statusCodePhraseMap).map(([code, phrase]) => (
                  <option key={code} value={code}>{code} {phrase}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mock-response-create-body-type" className="block font-medium">
                Body Type
              </label>
              <select
                id="mock-response-create-body-type"
                name="bodyType"
                className="textbox w-full mt-2"
                value={formik.values.bodyType}
                onChange={formik.handleChange}
                disabled={isExampleLinked}
              >
                {BODY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {examples.length > 0 ? (
            <div className="mt-4">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="useExample"
                  className="mt-1 cursor-pointer"
                  checked={formik.values.useExample}
                  onChange={handleUseExampleChange}
                  data-testid="mock-response-use-example-checkbox"
                />
                <span>
                  <span className="block font-medium">Copy from a collection example</span>
                  <span className="block text-xs opacity-70 mt-1">
                    Reuses the example's request, status code and body instead of starting from an empty response.
                  </span>
                </span>
              </label>

              {formik.values.useExample ? (
                <>
                  <select
                    name="selectedExampleKey"
                    className="textbox w-full mt-2"
                    value={formik.values.selectedExampleKey}
                    onChange={handleExampleChange}
                    onBlur={formik.handleBlur}
                    data-testid="mock-response-example-select"
                  >
                    <option value="">Select an example</option>
                    {examples.map(({ item, example }) => (
                      <option key={`${item.uid}-${example.uid}`} value={`${item.uid}:${example.uid}`}>
                        {example.name} ({item.name})
                      </option>
                    ))}
                  </select>
                  {formik.errors.selectedExampleKey ? (
                    <div className="text-red-500 mt-1">{formik.errors.selectedExampleKey}</div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>
    </Portal>
  );
};

export default CreateMockResponseModal;
