import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from 'components/Modal';
import Help from 'components/Help';

const CollectionItemInfo = ({ item, onClose }) => {
  const { t } = useTranslation();
  const { name, filename, type } = item;

  return (
    <Modal
      size="md"
      title={t('SIDEBAR.INFO')}
      handleCancel={onClose}
      hideCancel={true}
      hideFooter={true}
    >
      <div className="w-fit flex flex-col h-full">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="">
              <td className="py-2 px-2 text-left text-muted ">
                {type == 'folder' ? t('SIDEBAR.FOLDER_NAME') : t('SIDEBAR.REQUEST_NAME')}
              </td>
              <td className="py-2 px-2 text-nowrap truncate max-w-[500px]" title={name}>
                <span className="mr-2">:</span>{name}
              </td>
            </tr>
            <tr className="">
              <td className="py-2 px-2 text-left text-muted flex items-center">
                {type == 'folder' ? t('SIDEBAR.FOLDER_NAME') : t('SIDEBAR.FILE_NAME')}
                <small className="font-normal text-muted ml-1">{t('SIDEBAR.ON_FILESYSTEM')}</small>
                {type == 'folder' ? (
                  <Help width="300">
                    <p>
                      {t('SIDEBAR.INFO_FOLDER_NAME')}
                    </p>
                  </Help>
                ) : (
                  <Help width="300">
                    <p>
                      {t('SIDEBAR.INFO_REQUEST_FILE')}
                    </p>
                  </Help>
                )}
              </td>
              <td className="py-2 px-2 break-all text-nowrap truncate max-w-[500px]" title={filename}>
                <span className="mr-2">:</span>
                {filename}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default CollectionItemInfo;
