import { useDispatch } from "react-redux";
import React, { forwardRef, useState } from 'react';
import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { IconPlus, IconCaretDown, IconTrash } from '@tabler/icons';
import { cloneDeep } from "lodash";
import SingleLineEditor from "components/SingleLineEditor/index";
import StyledWrapper from "./StyledWrapper";
import Table from "components/Table/index";

const AdditionalParams  = ({ item = {}, request, updateAuth, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('authorization');

  const oAuth = get(request, 'auth.oauth2', {});
  const {
    grantType,
    additionalParameters = {}
  } = oAuth;

  const updateAdditionalParams = ({ updatedAdditionalParams }) => {
    dispatch(
      updateAuth({
        mode: 'oauth2',
        collectionUid: collection.uid,
        itemUid: item.uid,
        content: {
          ...oAuth,
          additionalParameters: updatedAdditionalParams,
        }
      })
    );
  }

  const handleUpdateAdditionalParam = ({ paramType, key, paramIndex, value }) => {
    const updatedAdditionalParams = cloneDeep(additionalParameters);
    updatedAdditionalParams[paramType][paramIndex][key] = value;
    updateAdditionalParams({ updatedAdditionalParams });
  }

  const handleDeleteAdditionalParam = ({ paramType, paramIndex }) => {
    const updatedAdditionalParams = cloneDeep(additionalParameters);
    updatedAdditionalParams[paramType] = updatedAdditionalParams[paramType]?.filter((_, index) => index !== paramIndex);
    updateAdditionalParams({ updatedAdditionalParams });
  }

  const handleAddNewAdditionalParam = () => {
    const paramType = activeTab;
    const updatedAdditionalParams = cloneDeep(additionalParameters);
    if (!updatedAdditionalParams?.[paramType]) {
      updatedAdditionalParams[paramType] = [];
    }
    updatedAdditionalParams[paramType] = [
      ...updatedAdditionalParams[paramType],
      {
        name: '',
        value: '',
        sendIn: 'headers',
        enabled: true
      }
    ];
    updateAdditionalParams({ updatedAdditionalParams });
  }
  return (
    <StyledWrapper className="mt-4">
      <div className="tabs flex w-full gap-2 my-2">
        <div className={`tab ${activeTab == 'authorization' ? 'active': ''}`} onClick={e => setActiveTab('authorization')}>Authorization</div>
        <div className={`tab ${activeTab == 'token' ? 'active': ''}`} onClick={e => setActiveTab('token')}>Token</div>
        <div className={`tab ${activeTab == 'refresh' ? 'active': ''}`} onClick={e => setActiveTab('refresh')}>Refresh</div>
      </div>
      <Table
        headers={[
          { name: 'Key', accessor: 'name', width: '30%' },
          { name: 'Value', accessor: 'value', width: '30%' },
          { name: 'Sends In', accessor: 'sendIn', width: '150px' },
          { name: '', accessor: '', width: '15%' }
        ]}
      >
        <tbody>
          {additionalParameters?.[activeTab]?.map((param, index) => 
            <tr>
              <td className='flex relative'>
                <SingleLineEditor
                  value={param?.name}
                  theme={storedTheme}
                  // onSave={handleSave}
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
                  // onSave={handleSave}
                  onChange={(value) => handleUpdateAdditionalParam({ 
                    paramType: activeTab,
                    key: 'value',
                    paramIndex: index,
                    value
                  })}
                  collection={collection}
                />
              </td>
              <td>
                <div className="w-full additional-parameter-sends-in-selector">
                  <select 
                    value={param?.sendIn} 
                    onChange={e => {
                      handleUpdateAdditionalParam({ 
                        paramType: activeTab,
                        key: 'sendIn',
                        paramIndex: index,
                        value: e.target.value
                      })
                    }} 
                    className="mousetrap bg-transparent"
                  >
                    {sendInOptionsMap[grantType].map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={param?.enabled}
                    tabIndex="-1"
                    className="mr-3 mousetrap"
                    onChange={(e) => {
                      handleUpdateAdditionalParam({ 
                        paramType: activeTab,
                        key: 'enabled',
                        paramIndex: index,
                        value: e.target.checked
                      })
                    }}
                  />
                  <button 
                    tabIndex="-1" 
                    onClick={() => {
                      handleDeleteAdditionalParam({
                        paramType: activeTab,
                        paramIndex: index
                      })
                    }}
                  >
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <div className="add-additional-param-actions">
        <IconPlus size={16} strokeWidth={1.5} style={{ marginLeft: '2px' }} onClick={handleAddNewAdditionalParam} />
      </div>
    </StyledWrapper>
  )
}

export default AdditionalParams;

const Icon = forwardRef((props, ref) => {
  const { value } = props
  return (
    <div ref={ref} className="w-max textbox border p-2 rounded cursor-pointer flex items-center selector-label">
      <div className="flex-grow font-medium">
        {value}
      </div>
      <div>
        <IconCaretDown className="caret mx-2" size={14} strokeWidth={2} />
      </div>
    </div>
  );
});

const sendInOptionsMap = {
  'authorization_code': ['headers', 'queryparams'],
  'password': ['headers', 'queryparams', 'body'],
  'client_credentials': ['headers', 'queryparams', 'body']
}