import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';

import { IconBrandGithub, IconPlus, IconDownload, IconFolders, IconSpeakerphone, IconBook } from '@tabler/icons';

import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import ImportSettings from 'components/Sidebar/ImportSettings';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const collections = useSelector((state) => state.collections.collections);
  const [importedCollection, setImportedCollection] = useState(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);
  const [openApiData, setOpenApiData] = useState(null);
  const [groupingType, setGroupingType] = useState('tags');
  const [importSettingsModalOpen, setImportSettingsModalOpen] = useState(false);

  const handleOpenCollection = () => {
    dispatch(openCollection())
      .catch((err) => {
        console.error(err);
        toast.error(t('WELCOME.COLLECTION_OPEN_ERROR'));
      });
  };

  const handleImportCollection = ({ collection, openApiData: apiData }) => {
    if (apiData) {
      // OpenAPI import - show settings first
      setOpenApiData(apiData);
      setImportCollectionModalOpen(false);
      setImportSettingsModalOpen(true);
    } else {
      // Regular import - go directly to location
      setImportedCollection(collection);
      setImportCollectionModalOpen(false);
      setImportCollectionLocationModalOpen(true);
    }
  };

  const handleImportSettings = () => {
    try {
      const collection = convertOpenapiToBruno(openApiData, { groupBy: groupingType });
      setImportedCollection(collection);
      setImportSettingsModalOpen(false);
      setImportCollectionLocationModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to process OpenAPI specification');
    }
  };

  const handleImportCollectionLocation = (collectionLocation) => {
    dispatch(importCollection(importedCollection, collectionLocation))
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportedCollection(null);
        setOpenApiData(null);
        toast.success(t('WELCOME.COLLECTION_IMPORT_SUCCESS'));
      })
      .catch((err) => {
        setImportCollectionLocationModalOpen(false);
        console.error(err);
        toast.error(t('WELCOME.COLLECTION_IMPORT_ERROR'));
      });
  };

  return (
    <StyledWrapper className="pb-4 px-6 mt-6">
      {createCollectionModalOpen ? <CreateCollection onClose={() => setCreateCollectionModalOpen(false)} /> : null}
      {importCollectionModalOpen ? (
        <ImportCollection onClose={() => setImportCollectionModalOpen(false)} handleSubmit={handleImportCollection} />
      ) : null}
      {importSettingsModalOpen ? (
        <ImportSettings
          groupingType={groupingType}
          setGroupingType={setGroupingType}
          onImport={handleImportSettings}
          onCancel={() => setImportSettingsModalOpen(false)}
        />
      ) : null}
      {importCollectionLocationModalOpen ? (
        <ImportCollectionLocation
          collectionName={importedCollection.name}
          onClose={() => setImportCollectionLocationModalOpen(false)}
          handleSubmit={handleImportCollectionLocation}
        />
      ) : null}

      <div aria-hidden className="">
        <Bruno width={50} />
      </div>
      <div className="text-xl font-semibold select-none">bruno</div>
      <div className="mt-4">{t('WELCOME.ABOUT_BRUNO')}</div>

      <div className="uppercase font-semibold heading mt-10">{t('COMMON.COLLECTIONS')}</div>
      <div className="mt-4 flex items-center collection-options select-none">
        <button
          className="flex items-center"
          onClick={() => setCreateCollectionModalOpen(true)}
          aria-label={t('WELCOME.CREATE_COLLECTION')}
        >
          <IconPlus aria-hidden size={18} strokeWidth={2} />
          <span className="label ml-2" id="create-collection" data-testid="create-collection">
            {t('WELCOME.CREATE_COLLECTION')}
          </span>
        </button>

        <button className="flex items-center ml-6" onClick={handleOpenCollection} aria-label="Open Collection">
          <IconFolders aria-hidden size={18} strokeWidth={2} />
          <span className="label ml-2">{t('WELCOME.OPEN_COLLECTION')}</span>
        </button>

        <button
          className="flex items-center ml-6"
          onClick={() => setImportCollectionModalOpen(true)}
          aria-label={t('WELCOME.IMPORT_COLLECTION')}
        >
          <IconDownload aria-hidden size={18} strokeWidth={2} />
          <span className="label ml-2" id="import-collection">
            {t('WELCOME.IMPORT_COLLECTION')}
          </span>
        </button>
      </div>

      <div className="uppercase font-semibold heading mt-10 pt-6">{t('WELCOME.LINKS')}</div>
      <div className="mt-4 flex flex-col collection-options select-none">
        <div className="flex items-center mt-2">
          <a
            href="https://docs.usebruno.com"
            aria-label="Read documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <IconBook aria-hidden size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.DOCUMENTATION')}</span>
          </a>
        </div>
        <div className="flex items-center mt-2">
          <a
            href="https://github.com/usebruno/bruno/issues"
            aria-label="Report issues on GitHub"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <IconSpeakerphone aria-hidden size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.REPORT_ISSUES')}</span>
          </a>
        </div>
        <div className="flex items-center mt-2">
          <a
            href="https://github.com/usebruno/bruno"
            aria-label="Go to GitHub repository"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <IconBrandGithub aria-hidden size={18} strokeWidth={2} />
            <span className="label ml-2">{t('COMMON.GITHUB')}</span>
          </a>
        </div>

        <div className="mt-10 select-none">
          {t('WELCOME.GLOBAL_SEARCH_TIP_PART1')} <span className="keycap">⌘</span>{' '}<span className="keycap">K</span>{' '}
          {t('WELCOME.GLOBAL_SEARCH_TIP_PART2')} <span className="keycap">Ctrl</span>{' '}<span className="keycap">K</span>{' '}
          {t('WELCOME.GLOBAL_SEARCH_TIP_PART3')}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Welcome;
