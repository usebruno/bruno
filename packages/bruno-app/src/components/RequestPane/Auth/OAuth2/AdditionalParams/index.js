import { useDispatch } from "react-redux";
import React, { useRef, forwardRef, useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { IconPlus } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { cloneDeep } from "lodash";

const AdditionalParams  = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const dropdownTippyRef = useRef();
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const [activeTab, setActiveTab] = useState('authorization');

  const oAuth = get(request, 'auth.oauth2', {});
  const {
    grantType,
    callbackUrl,
    authorizationUrl,
    accessTokenUrl,
    clientId,
    clientSecret,
    scope,
    credentialsPlacement,
    state,
    pkce,
    credentialsId,
    tokenPlacement,
    tokenHeaderPrefix,
    tokenQueryKey,
    refreshTokenUrl,
    autoRefreshToken,
    autoFetchToken,
    additionalParams = {}
  } = oAuth;

  const handleUpdateAdditionalParam = ({ paramType, key, paramIndex, value }) => {
    const updatedAdditionalParams = cloneDeep(additionalParams);

    updatedAdditionalParams[paramType][paramIndex][key] = value;

    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType,
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          pkce,
          credentialsPlacement,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          refreshTokenUrl,
          autoRefreshToken,
          autoFetchToken,
          additionalParams: updatedAdditionalParams,
        }
      })
    );
  }

  const handleAddNewAdditionalParam = () => {
    const paramType = activeTab;
    const updatedAdditionalParams = cloneDeep(additionalParams);
    if (!updatedAdditionalParams?.[paramType]) {
      updatedAdditionalParams[paramType] = [];
    }
    updatedAdditionalParams[paramType] = [
      ...updatedAdditionalParams[paramType],
      {
        name: '',
        value: '',
        sendIn: 'header'
      }
    ];

    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          grantType,
          callbackUrl,
          authorizationUrl,
          accessTokenUrl,
          clientId,
          clientSecret,
          state,
          scope,
          pkce,
          credentialsPlacement,
          credentialsId,
          tokenPlacement,
          tokenHeaderPrefix,
          tokenQueryKey,
          refreshTokenUrl,
          autoRefreshToken,
          autoFetchToken,
          additionalParams: updatedAdditionalParams,
        }
      })
    );
  }
  return (
    <div>
      <div className="tabs">
        <div className="tab">Authorization</div>
        <div className="tab">Token</div>
        <div className="tab">Refresh</div>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="py-2 px-4 font-semibold w-32">Key</th>
            <th className="py-2 px-4 font-semibold w-32">Value</th>
            <th className="py-2 px-4 font-semibold w-32">Send In</th>
          </tr>
        </thead>
        <tbody>
          {additionalParams?.[activeTab]?.map((param, index) => 
            <tr>
              <td>
                <SingleLineEditor
                  value={param?.name}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(value) => handleUpdateAdditionalParam({ 
                    paramType: activeTab,
                    key: 'name',
                    paramIndex: index,
                    value
                  })}
                  collection={collection}
                />
              </td>
              <td>
                <SingleLineEditor
                  value={param?.value}
                  theme={storedTheme}
                  onSave={handleSave}
                  onChange={(value) => handleUpdateAdditionalParam({ 
                    paramType: activeTab,
                    key: 'value',
                    paramIndex: index,
                    value
                  })}
                  collection={collection}
                />
              </td>
              <Dropdown onCreate={onDropdownCreate} icon={<Icon />} placement="bottom-end">      
              <div
                  className="dropdown-item"
                  onClick={() => {
                    dropdownTippyRef.current.hide();
                    handleUpdateAdditionalParam({ 
                      paramType: activeTab,
                      key: 'sendIn',
                      paramIndex: index,
                      value: 'header'
                    })
                  }}
                >
                  Header
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    dropdownTippyRef.current.hide();
                    handleUpdateAdditionalParam({ 
                      paramType: activeTab,
                      key: 'sendIn',
                      paramIndex: index,
                      value: 'queryparams'
                    })
                  }}
                >
                  Query Params
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    dropdownTippyRef.current.hide();
                    handleUpdateAdditionalParam({ 
                      paramType: activeTab,
                      key: 'sendIn',
                      paramIndex: index,
                      value: 'body'
                    })
                  }}
                >
                  Body
                </div>
              </Dropdown>
            </tr>
          )}
        </tbody>
      </table>
      <div className="add-additional-param-actions">
        <IconPlus size={16} strokeWidth={1.5} style={{ marginLeft: '2px' }} onClick={handleAddNewAdditionalParam} />
      </div>
    </div>
  )
}

export default AdditionalParams;