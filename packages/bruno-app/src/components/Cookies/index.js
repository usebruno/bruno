import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import Accordion from 'components/Accordion/index';
import { IconTrash, IconEdit, IconCirclePlus, IconCookieOff } from '@tabler/icons';
import { deleteCookiesForDomain, deleteCookie } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import ModifyCookieModal from 'components/Cookies/ModifyCookieModal/index';

import StyledWrapper from './StyledWrapper';
import { isValidDomain } from 'utils/common/index';

const CollectionProperties = ({ onClose }) => {
  const dispatch = useDispatch();
  const cookies = useSelector((state) => state.app.cookies) || [];
  const [isModifyCookieModalOpen, setIsModifyCookieModalOpen] = React.useState(false);
  const [domainToAdd, setDomainToAdd] = React.useState('');
  const [currentDomain, setCurrentDomain] = React.useState('');
  const [cookieToEdit, setCookieToEdit] = React.useState(null);

  const isAddDomainDisabled = () => {
    if (!domainToAdd) return true;
    if (cookies.find((cookie) => cookie.domain === domainToAdd)) return true;
    if (!isValidDomain(domainToAdd)) return true;
    return false;
  };

  const handleAddDomain = () => {
    console.log('Adding domain', domainToAdd);
    setCurrentDomain(domainToAdd);
    setIsModifyCookieModalOpen(true);
  };

  const handleDeleteCookie = (domain, path, key) => {
    dispatch(deleteCookie(domain, path, key))
      .then(() => {
        toast.success('Cookie deleted successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to delete cookie'));
  };

  const handleAddCookie = (domain) => {
    setCurrentDomain(domain);
    setIsModifyCookieModalOpen(true);
  };

  const handleEditCookie = (domain, cookie) => {
    setCurrentDomain(domain);
    setCookieToEdit(cookie);
    setIsModifyCookieModalOpen(true);
  };

  const handleDeleteDomain = (domain) => {
    dispatch(deleteCookiesForDomain(domain))
      .then(() => {
        toast.success('Domain deleted successfully');
      })
      .catch((err) => console.log(err) && toast.error('Failed to delete domain'));
  };

  if (!cookies || !cookies.length) {
    // show empty state, with add button and relevant text
    return (
      <>
        <Modal size="lg" title="Cookies" hideFooter={true} handleCancel={onClose}>
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

  return (
    <>
      <Modal size="lg" title="Cookies" hideFooter={true} handleCancel={onClose}>
        <StyledWrapper>
          <div className="flex items-end justify-between gap-4 mb-3">
            <div className=" flex flex-col items-start w-full">
              <label htmlFor="domain" className="sr-only">
                Domain
              </label>
              <input
                id="domain"
                type="text"
                name="domain"
                placeholder="*.example.org"
                className="textbox w-full"
                onChange={(e) => setDomainToAdd(e.target.value)}
                value={domainToAdd}
              />
            </div>
            <button
              type="submit"
              className="submit btn btn-sm btn-secondary h-9"
              onClick={handleAddDomain}
              disabled={isAddDomainDisabled()}
            >
              Add Domain
            </button>
          </div>
          <Accordion defaultIndex={0}>
            {cookies.map((domainWithCookies, i) => (
              <Accordion.Item key={i} index={i}>
                <Accordion.Header index={i} className="flex items-center">
                  <div className="flex">
                    <span>{domainWithCookies.domain}</span>{' '}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="submit"
                        className="submit btn btn-sm btn-secondary flex  items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCookie(domainWithCookies.domain);
                        }}
                      >
                        <IconCirclePlus strokeWidth={1.5} size={16} />
                        <span>Add cookie</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDomain(domainWithCookies.domain);
                        }}
                        className="text-gray-950 dark:text-white  hover:text-red-600  mr-2"
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
                        <tr className="text-left border-b">
                          <th className="py-2 px-4 font-medium w-48">Name</th>
                          <th className="py-2 px-4 font-medium">Value</th>
                          <th className="py-2 px-4 font-medium">Path</th>
                          <th className="py-2 px-4 font-medium">Expires</th>
                          <th className="py-2 px-4 font-medium text-center">Secure</th>
                          <th className="py-2 px-4 font-medium text-center">HTTP Only</th>
                          <th className="py-2 px-4 font-medium text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainWithCookies.cookies.map((cookie) => (
                          <tr key={cookie.key} className="border-b">
                            <td className="py-2 px-4 truncate">{cookie.key}</td>
                            <td className="py-2 px-4 truncate">{cookie.value}</td>
                            <td className="py-2 px-4 truncate">{cookie.path || '/'}</td>
                            <td className="py-2 px-4 truncate">
                              {cookie.expires ? new Date(cookie.expires).toLocaleString() : 'Session Cookie'}
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
                                  onClick={() => handleDeleteCookie(domainWithCookies.domain, cookie.path, cookie.key)}
                                  className="text-gray-950 dark:text-white hover:text-red-600"
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
        </StyledWrapper>
      </Modal>
      {isModifyCookieModalOpen && (
        <ModifyCookieModal
          onClose={() => {
            setCookieToEdit(null);
            setCurrentDomain('');
            setDomainToAdd('');
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
