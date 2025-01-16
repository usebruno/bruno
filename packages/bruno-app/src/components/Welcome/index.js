import { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { openCollection, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import { IconBrandGithub, IconPlus, IconDownload, IconFolders, IconSpeakerphone, IconBook } from '@tabler/icons';

import Bruno from 'components/Bruno';
import CreateCollection from 'components/Sidebar/CreateCollection';
import ImportCollection from 'components/Sidebar/ImportCollection';
import ImportCollectionLocation from 'components/Sidebar/ImportCollectionLocation';
import StyledWrapper from './StyledWrapper';

const Welcome = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [importedCollection, setImportedCollection] = useState(null);
  const [importedTranslationLog, setImportedTranslationLog] = useState({});
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false);
  const [importCollectionModalOpen, setImportCollectionModalOpen] = useState(false);
  const [importCollectionLocationModalOpen, setImportCollectionLocationModalOpen] = useState(false);

  const handleOpenCollection = () => {
    dispatch(openCollection()).catch((err) => console.log(err) && toast.error(t('WELCOME.COLLECTION_OPEN_ERROR')));
  };

  const handleImportCollection = ({ collection, translationLog }) => {
    setImportedCollection(collection);
    if (translationLog) {
      setImportedTranslationLog(translationLog);
    }
    setImportCollectionModalOpen(false);
    setImportCollectionLocationModalOpen(true);
  };

  const handleImportCollectionLocation = (collectionLocation) => {
    dispatch(importCollection(importedCollection, collectionLocation))
      .then(() => {
        setImportCollectionLocationModalOpen(false);
        setImportedCollection(null);
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
      {importCollectionLocationModalOpen ? (
        <ImportCollectionLocation
          translationLog={importedTranslationLog}
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
          <span className="label ml-2" id="create-collection">
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
      </div>
    </StyledWrapper>
  );
};

export default Welcome;
