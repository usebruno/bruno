import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import Accordion from 'components/Accordion/index';
import { IconTrash, IconEdit, IconCirclePlus, IconCookieOff, IconAlertTriangle, IconSearch } from '@tabler/icons';
import { deleteCookiesForDomain, deleteCookie } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import ModifyCookieModal from 'components/Cookies/ModifyCookieModal/index';
import StyledWrapper from './StyledWrapper';
import moment from 'moment';
import { Tooltip } from 'react-tooltip';

const CollectionProperties = ({ onClose }) => {
  const dispatch = useDispatch();
  const cookies = useSelector((state) => state.app.cookies) || [];
  const [isModifyCookieModalOpen, setIsModifyCookieModalOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');
  const [cookieToEdit, setCookieToEdit] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalContent, setDeleteModalContent] = useState(null);
  const [deleteModalTitle, setDeleteModalTitle] = useState('');
  const [onDeleteAction, setOnDeleteAction] = useState(() => {});
  const [searchText, setSearchText] = useState('');

  const handleAddCookie = (domain) => {
    setCurrentDomain(domain);
    setIsModifyCookieModalOpen(true);
  };

  const handleEditCookie = (domain, cookie) => {
    setCurrentDomain(domain);
    setCookieToEdit(cookie);
    setIsModifyCookieModalOpen(true);
  };

  const openModal = (title, content, onDelete) => {
    setDeleteModalTitle(title);
    setDeleteModalContent(content);
    setOnDeleteAction(() => onDelete);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteDomain = (domain) => {
    openModal('Delete Domain', `Are you sure you want to delete the domain ${domain}?`, () => {
      dispatch(deleteCookiesForDomain(domain))
        .then(() => {
          toast.success('Domain deleted successfully');
        })
        .catch((err) => console.log(err) && toast.error('Failed to delete domain'));
      closeDeleteModal();
    });
  };

  const handleDeleteCookie = (domain, path, key) => {
    openModal('Delete Cookie', `Are you sure you want to delete the cookie ${key}?`, () => {
      dispatch(deleteCookie(domain, path, key))
        .then(() => {
          toast.success('Cookie deleted successfully');
        })
        .catch((err) => console.log(err) && toast.error('Failed to delete cookie'));
      closeDeleteModal();
    });
  };

  const filteredCookies = useMemo(() => {
    return cookies.filter((cookie) => cookie.domain.toLowerCase().includes(searchText.toLowerCase()));
  }, [cookies, searchText]);

  if (!cookies || !cookies.length) {
    return (
      <>
        <Modal size="xl" title="Cookies" hideFooter={true} handleCancel={onClose}>
          <StyledWrapper>
            <div className="flex items-center justify-center flex-col">
              <IconCookieOff size={48} />
              <h2 className="text-lg font-semibold mt-4">No cookies found</h2>
              <p className="text-gray-500 mt-2">Add cookies to get started</p>
              <button
                type="submit"
                className="submit btn btn-sm btn-secondary flex items-center gap-1 mt-4"
                onClick={() => {
                  handleAddCookie('');
                }}
              >
                <IconCirclePlus strokeWidth={1.5} size={16} />
                <span>Add cookie</span>
              </button>
            </div>
          </StyledWrapper>
        </Modal>
        {isModifyCookieModalOpen && (
          <ModifyCookieModal
            onClose={() => {
              setCookieToEdit(null);
              setCurrentDomain('');
              setIsModifyCookieModalOpen(false);
            }}
            domain={currentDomain}
            cookie={cookieToEdit}
          />
        )}
      </>
    );
  }

  if (cookies.length && !filteredCookies.length) {
    return (
      <>
        <Modal
          size="xl"
          title="Cookies"
          hideFooter={true}
          handleCancel={onClose}
          customHeader={
            <StyledWrapper className="flex items-center justify-between w-full">
              <h2 className="text-sm font-semibold">Cookies</h2>
              <input
                type="search"
                placeholder="Search by domain"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
                className="block textbox non-passphrase-input h-9 ml-auto"
              />
              <button
                type="submit"
                className="submit btn btn-sm h-9 btn-secondary flex items-center gap-1 mx-4"
                onClick={() => {
                  handleAddCookie('');
                }}
              >
                <IconCirclePlus strokeWidth={1.5} size={16} />
                <span>Add New</span>
              </button>
            </StyledWrapper>
          }
        >
          <StyledWrapper>
            <div className="flex items-center justify-center flex-col">
              <IconSearch size={48} />
              <h2 className="text-lg font-semibold mt-4">No search results</h2>
              <p className="text-gray-500 mt-2">Try a different search term</p>
            </div>
          </StyledWrapper>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Modal
        size="xl"
        title="Cookies"
        hideFooter={true}
        handleCancel={onClose}
        customHeader={
          <StyledWrapper className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold">Cookies</h2>
            <input
              type="search"
              placeholder="Search by domain"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block textbox non-passphrase-input h-9 ml-auto"
            />
            <button
              type="submit"
              className="submit btn btn-sm h-9 btn-secondary flex items-center gap-1 mx-4"
              onClick={() => {
                handleAddCookie('');
              }}
            >
              <IconCirclePlus strokeWidth={1.5} size={16} />
              <span>Add New</span>
            </button>
          </StyledWrapper>
        }
      >
        <StyledWrapper>
          <div className="scroll-box">
            <Accordion defaultIndex={0}>
              {filteredCookies.map((domainWithCookies, i) => (
                <Accordion.Item key={i} index={i}>
                  <Accordion.Header index={i} className="flex items-center">
                    <div className="flex items-center">
                      <span>{domainWithCookies.domain}</span>
                      <span className="ml-2 text-xs dark:text-gray-300 text-gray-500">
                        ({domainWithCookies.cookies.length}{' '}
                        {domainWithCookies.cookies.length === 1 ? 'cookie' : 'cookies'})
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="submit"
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-950 dark:text-white dark:hover:text-gray-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCookie(domainWithCookies.domain);
                          }}
                        >
                          <IconCirclePlus strokeWidth={1.5} size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDomain(domainWithCookies.domain);
                          }}
                          className="text-gray-950 dark:text-white dark:hover:hover:text-red-600 hover:text-red-600  mr-2"
                        >
                          <IconTrash strokeWidth={1.5} size={16} />
                        </button>
                      </div>
                    </div>
                  </Accordion.Header>
                  <Accordion.Content index={i}>
                    <div className="flex items-center justify-between">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-gray-300 dark:border-gray-500">
                            <th className="py-2 px-4 font-medium w-32">Name</th>
                            <th className="py-2 px-4 font-medium w-52">Value</th>
                            <th className="py-2 px-4 font-medium">Path</th>
                            <th className="py-2 px-4 font-medium">Expires</th>
                            <th className="py-2 px-4 font-medium text-center">Secure</th>
                            <th className="py-2 px-4 font-medium text-center">HTTP Only</th>
                            <th className="py-2 px-4 font-medium text-right w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {domainWithCookies.cookies.map((cookie) => (
                            <tr key={cookie.key} className="border-b border-gray-300 dark:border-gray-500">
                              <td className="py-2 px-4 truncate">{cookie.key}</td>
                              <td className="py-2 px-4 truncate">
                                <span id={`cookie-value-${cookie.key}`}>{cookie.value}</span>
                                <Tooltip
                                  anchorId={`cookie-value-${cookie.key}`}
                                  className="tooltip-mod"
                                  html={cookie.value}
                                />
                              </td>
                              <td className="py-2 px-4 truncate">{cookie.path || '/'}</td>
                              <td className="py-2 px-4 truncate">
                                <span id={`cookie-expires-${cookie.key}`}>
                                  {cookie.expires && moment(cookie.expires).isValid()
                                    ? new Date(cookie.expires).toLocaleString()
                                    : 'Session Cookie'}
                                </span>
                                {cookie.expires && moment(cookie.expires).isValid() && (
                                  <Tooltip
                                    anchorId={`cookie-expires-${cookie.key}`}
                                    className="tooltip-mod"
                                    html={new Date(cookie.expires).toLocaleString()}
                                  />
                                )}
                              </td>
                              <td className="py-2 px-4 text-center">{cookie.secure ? '✓' : ''}</td>
                              <td className="py-2 px-4 text-center">{cookie.httpOnly ? '✓' : ''}</td>
                              <td className="py-2 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditCookie(domainWithCookies.domain, cookie)}
                                    className="text-gray-700  hover:text-gray-950 
                                  dark:text-white dark:hover:text-gray-300"
                                  >
                                    <IconEdit strokeWidth={1.5} size={16} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteCookie(domainWithCookies.domain, cookie.path, cookie.key)
                                    }
                                    className="text-gray-950 dark:text-white dark:hover:hover:text-red-600  hover:text-red-600"
                                  >
                                    <IconTrash strokeWidth={1.5} size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </StyledWrapper>
      </Modal>
      {isDeleteModalOpen && (
        <Modal onClose={closeDeleteModal} handleCancel={closeDeleteModal} title={deleteModalTitle} hideFooter={true}>
          <div className="flex items-center font-normal">
            <IconAlertTriangle size={32} strokeWidth={1.5} className="text-yellow-600" />
            <h1 className="ml-2 text-lg font-semibold">Hold on..</h1>
          </div>
          <div className="font-normal mt-4">{deleteModalContent}</div>

          <div className="flex justify-between mt-6">
            <div>
              <button className="btn btn-sm btn-close" onClick={closeDeleteModal}>
                Close
              </button>
            </div>
            <div>
              <button className="btn btn-sm btn-danger" onClick={onDeleteAction}>
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
      {isModifyCookieModalOpen && (
        <ModifyCookieModal
          onClose={() => {
            setCookieToEdit(null);
            setCurrentDomain('');
            setIsModifyCookieModalOpen(false);
          }}
          domain={currentDomain}
          cookie={cookieToEdit}
        />
      )}
    </>
  );
};

export default CollectionProperties;
