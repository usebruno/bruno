import React from 'react';
import Modal from 'components/Modal';
import { IconCheck, IconInfoCircle, IconAlertTriangle, IconLoader2 } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { cloneDeep } from 'lodash';
import { transformCollectionToSaveToExportAsFile } from 'utils/collections/index';
import { useSelector } from 'react-redux';
import { findCollectionByUid, areItemsLoading } from 'utils/collections/index';
import { brunoToOpenCollection } from '@usebruno/converters';
import { sanitizeName } from 'utils/common/regex';
import * as FileSaver from 'file-saver';
import jsyaml from 'js-yaml';
import toast from 'react-hot-toast';
import { useApp } from 'providers/App';
import { escapeHtml } from 'utils/response';

const GenerateDocumentation = ({ onClose, collectionUid }) => {
  const { version } = useApp();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const isCollectionLoading = areItemsLoading(collection);

  const generateHtmlDocumentation = () => {
    try {
      const collectionCopy = cloneDeep(collection);
      const transformedCollection = transformCollectionToSaveToExportAsFile(collectionCopy);
      const openCollection = brunoToOpenCollection(transformedCollection);

      if (!openCollection.extensions) {
        openCollection.extensions = {};
      }
      if (!openCollection.extensions.bruno) {
        openCollection.extensions.bruno = {};
      }
      openCollection.extensions.bruno.exportedAt = new Date().toISOString();
      openCollection.extensions.bruno.exportedUsing = version ? `Bruno/${version}` : 'Bruno';

      const yamlContent = jsyaml.dump(openCollection, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      const escapedYaml = yamlContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      const escapedCollectionName = escapeHtml(collection.name);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedCollectionName} - API Documentation</title>
    <style>
        body {
            margin: 0;
            padding: 0;
        }
        #opencollection-container {
            width: 100vw;
            height: 100vh;
        }
    </style>
    <link rel="stylesheet" href="https://cdn.opencollection.com/core.css">
    <script src="https://cdn.opencollection.com/playground.umd.js"></script>
</head>
<body>
    <div id="opencollection-container"></div>
    <script>
        const collectionData = \`${escapedYaml}\`;
        const container = document.getElementById('opencollection-container');
        new window.OpenCollection({
            target: container,
            opencollection: collectionData,
            theme: 'light'
        });
    </script>
</body>
</html>`;

      const sanitizedName = sanitizeName(collection.name);
      const fileName = `${sanitizedName}-documentation.html`;
      const fileBlob = new Blob([htmlContent], { type: 'text/html' });

      FileSaver.saveAs(fileBlob, fileName);
      toast.success('Documentation generated successfully');
      onClose();
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Failed to generate documentation');
    }
  };

  return (
    <Modal
      size="md"
      title="Generate Documentation"
      confirmText={isCollectionLoading ? 'Loading...' : 'Generate'}
      cancelText="Cancel"
      handleConfirm={isCollectionLoading ? undefined : generateHtmlDocumentation}
      handleCancel={onClose}
      confirmDisabled={isCollectionLoading}
    >
      <StyledWrapper className="w-[500px]">
        <div className="flex flex-col gap-4">
          <div className="info-card flex items-start p-4 gap-3">
            <div className="info-icon shrink-0">
              {isCollectionLoading ? (
                <IconLoader2 size={20} className="animate-spin" />
              ) : (
                <IconInfoCircle size={20} />
              )}
            </div>
            <div className="flex-1">
              <div className="info-title mb-1">
                {isCollectionLoading ? 'Loading collection...' : 'Interactive API Documentation'}
              </div>
              <div className="info-description">
                {isCollectionLoading
                  ? 'Please wait while the collection is being loaded.'
                  : 'Generate a standalone HTML file containing interactive documentation for your API collection. This file can be hosted anywhere or shared with your team.'}
              </div>
            </div>
          </div>

          {!isCollectionLoading && (
            <>
              <div className="flex flex-col gap-2 mt-2">
                <div className="feature-item flex items-center gap-2 py-2 px-3">
                  <IconCheck size={16} className="feature-icon shrink-0" />
                  <span>Standalone HTML file - no server required</span>
                </div>
                <div className="feature-item flex items-center gap-2 py-2 px-3">
                  <IconCheck size={16} className="feature-icon shrink-0" />
                  <span>Interactive API playground</span>
                </div>
                <div className="feature-item flex items-center gap-2 py-2 px-3">
                  <IconCheck size={16} className="feature-icon shrink-0" />
                  <span>Host on any static file server</span>
                </div>
              </div>

              <div className="note-section flex items-start gap-2 p-3">
                <IconAlertTriangle size={16} className="shrink-0 mt-px" />
                <span>
                  The generated file uses OpenCollection CDN for rendering. An internet connection is required when viewing the documentation.
                </span>
              </div>
            </>
          )}
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default GenerateDocumentation;
