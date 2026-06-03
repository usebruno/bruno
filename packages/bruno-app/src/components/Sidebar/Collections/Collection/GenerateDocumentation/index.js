import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { cloneDeep } from 'lodash';
import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import jsesc from 'jsesc';
import toast from 'react-hot-toast';
import { IconBook, IconCheck, IconAlertTriangle, IconLoader2 } from '@tabler/icons';

import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';
import demoImage from './demo.png';
import { useApp } from 'providers/App';
import { transformCollectionToSaveToExportAsFile, findCollectionByUid, areItemsLoading } from 'utils/collections/index';
import { brunoToOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';
import { escapeHtml } from 'utils/response';

const CDN_BASE_URL = 'https://cdn.opencollection.com';

const FEATURES = [
  'Standalone HTML file - no server required',
  'Interactive API playground',
  'Host on any static file server'
];

const buildHtmlDocument = (collectionName, escapedYamlContent) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${collectionName} - API Documentation</title>
    <style>
        body { margin: 0; padding: 0; }
        #opencollection-container { width: 100vw; height: 100vh; }
    </style>
    <link rel="stylesheet" href="${CDN_BASE_URL}/docs.css">
    <script src="${CDN_BASE_URL}/docs.js"></script>
</head>
<body>
    <div id="opencollection-container"></div>
    <script>
        const collectionData = ${escapedYamlContent};
        new window.OpenCollection({
            target: document.getElementById('opencollection-container'),
            opencollection: collectionData,
            theme: 'light'
        });
    </script>
</body>
</html>`;

const CollectionNotFound = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal size="md" title={t('SIDEBAR.GENERATE_DOCUMENTATION')} confirmText={t('COMMON.CLOSE')} handleConfirm={onClose} hideCancel>
      <StyledWrapper className="w-[500px]">
        <div className="flex items-center gap-2 text-warning">
          <IconAlertTriangle size={16} className="shrink-0" />
          <span>{t('SIDEBAR.COLLECTION_NOT_AVAILABLE')}</span>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

const GenerateDocumentation = ({ onClose, collectionUid }) => {
  const { t } = useTranslation();
  const { version } = useApp();
  const collection = useSelector((state) =>
    findCollectionByUid(state.collections.collections, collectionUid)
  );

  const isLoading = useMemo(
    () => (collection ? areItemsLoading(collection) : false),
    [collection]
  );

  const handleGenerate = useCallback(() => {
    try {
      const collectionCopy = cloneDeep(collection);
      const transformedCollection = transformCollectionToSaveToExportAsFile(collectionCopy);
      const openCollection = brunoToOpenCollection(transformedCollection);

      openCollection.extensions = {
        ...openCollection.extensions,
        bruno: {
          ...openCollection.extensions?.bruno,
          exportedAt: new Date().toISOString(),
          exportedUsing: version ? `Bruno/${version}` : 'Bruno'
        }
      };

      const yamlContent = jsyaml.dump(openCollection, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      // jsesc handles all edge cases: Unicode, special chars, quotes, template literals, etc.
      let escapedYaml = jsesc(yamlContent, { quotes: 'double', wrap: true });

      // Escape closing tags to prevent HTML parser from breaking out of the script block
      escapedYaml = escapedYaml.replace(/<\//g, '<\\/');

      const htmlContent = buildHtmlDocument(
        escapeHtml(collection.name),
        escapedYaml
      );

      const fileName = `${sanitizeName(collection.name)}-documentation.html`;
      FileSaver.saveAs(new Blob([htmlContent], { type: 'text/html' }), fileName);

      toast.success(t('SIDEBAR.DOCS_GENERATED_SUCCESS'));
      onClose();
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error(t('SIDEBAR.FAILED_TO_GENERATE_DOCS'));
    }
  }, [collection, version, onClose, t]);

  if (!collection) {
    return <CollectionNotFound onClose={onClose} />;
  }

  return (
    <Modal
      size="md"
      title={t('SIDEBAR.GENERATE_DOCUMENTATION')}
      confirmText={isLoading ? t('COMMON.LOADING') : t('COMMON.CREATE')}
      cancelText={t('COMMON.CANCEL')}
      handleConfirm={isLoading ? undefined : handleGenerate}
      handleCancel={onClose}
      confirmDisabled={isLoading}
    >
      <StyledWrapper className="w-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <IconLoader2 size={20} className="animate-spin" />
            <span>{t('SIDEBAR.LOADING_COLLECTION')}</span>
          </div>
        ) : (
          <div className="content">
            <h3 className="title flex items-center gap-2 mt-2 font-medium">
              <IconBook size={18} />
              <span>{t('SIDEBAR.INTERACTIVE_API_DOCS')}</span>
            </h3>
            <p className="description mb-4">
              {t('SIDEBAR.GENERATE_DOCS_DESC')}
            </p>

            <div className="preview-container relative mb-4">
              <span className="preview-label absolute">{t('SIDEBAR.SAMPLE_OUTPUT')}</span>
              <img src={demoImage} alt={t('SIDEBAR.DOCUMENTATION_PREVIEW')} className="preview-image" />
            </div>

            <ul className="features flex flex-col list-none gap-2 p-0 mb-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <IconCheck size={16} className="check-icon flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="note m-0">
              {t('SIDEBAR.DOCS_CDN_NOTE')}
            </p>
          </div>
        )}
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateDocumentation;
