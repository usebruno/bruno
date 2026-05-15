import { IconLoader2, IconFile, IconAlertTriangle } from '@tabler/icons';
import { loadLargeRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const RequestNotLoaded = ({ collection, item }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleLoadLargeRequest = () => {
    !item?.loading && dispatch(loadLargeRequest({ collectionUid: collection?.uid, pathname: item?.pathname }));
  };

  return (
    <StyledWrapper>
      <div className="flex flex-col p-4">
        <div className="card shadow-sm rounded-md p-4 w-[685px]">
          <div>
            <div className="font-medium flex items-center gap-2 pb-4">
              <IconFile size={16} strokeWidth={1.5} className="text-gray-400" />
              {t('REQUEST_TAB_PANEL.FILE_INFO')}
            </div>
            <div className="hr" />

            <div className="flex items-center mt-2">
              <span className="w-12 mr-2 text-muted">{t('REQUEST_TAB_PANEL.NAME')}:</span>
              <div>{item?.name}</div>
            </div>

            <div className="flex items-center mt-1">
              <span className="w-12 mr-2 text-muted">{t('REQUEST_TAB_PANEL.PATH')}:</span>
              <div className="break-all">{item?.pathname}</div>
            </div>

            <div className="flex items-center mt-1 pb-4">
              <span className="w-12 mr-2 text-muted">{t('REQUEST_TAB_PANEL.SIZE')}:</span>
              <div>{item?.size?.toFixed?.(2)} MB</div>
            </div>

            {!item?.error && (
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 title bg-yellow-50 dark:bg-yellow-900/20">
                  <IconAlertTriangle size={16} className="text-yellow-500" />
                  <span>{t('REQUEST_TAB_PANEL.LARGE_REQUEST_WARNING')}</span>
                </div>
                <div className="flex flex-row mt-6 items-center gap-2 w-full">
                  <button
                    className={`submit btn btn-sm btn-secondary w-fit h-fit flex flex-row gap-2 ${item?.loading ? 'opacity-50 cursor-blocked' : ''}`}
                    onClick={handleLoadLargeRequest}
                  >
                    {t('REQUEST_TAB_PANEL.LOAD_REQUEST')}
                  </button>
                  <p>{t('REQUEST_TAB_PANEL.REGEX_PARSING_HINT')}</p>
                </div>
              </div>
            )}

            {item?.loading && (
              <>
                <div className="hr mt-4" />
                <div className="flex items-center gap-2 mt-4">
                  <IconLoader2 className="animate-spin" size={16} strokeWidth={2} />
                  <span>{t('REQUEST_TAB_PANEL.LOADING')}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default RequestNotLoaded;
