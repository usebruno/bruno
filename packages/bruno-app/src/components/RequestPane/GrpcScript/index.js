import React from 'react';
import get from 'lodash/get';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { GRPC_SCRIPT_KEYS, SCRIPT_TYPES } from '@usebruno/common';
import { updateGrpcScript } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateScriptPaneTab } from 'providers/ReduxStore/slices/tabs';
import { Tabs, TabsList, TabsTrigger } from 'components/Tabs';
import StatusDot from 'components/StatusDot';
import ScriptEditorPane from './ScriptEditorPane';

// Keyed by the in-memory hook name; the set and the order come from GRPC_SCRIPT_KEYS.
const HOOKS = {
  beforeCallStart: {
    label: 'Before Call Start',
    scriptType: SCRIPT_TYPES.BEFORE_CALL_START,
    showHintsFor: ['bru', 'grpc:before-call-start'],
    errorMessageKey: 'beforeCallStartScriptErrorMessage'
  },
  beforeMessageSend: {
    label: 'Before Message Send',
    scriptType: SCRIPT_TYPES.BEFORE_MESSAGE_SEND,
    showHintsFor: ['bru', 'grpc:before-message-send'],
    errorMessageKey: 'beforeMessageSendScriptErrorMessage'
  },
  afterMessageReceive: {
    label: 'After Message Receive',
    scriptType: SCRIPT_TYPES.AFTER_MESSAGE_RECEIVE,
    showHintsFor: ['bru', 'grpc:after-message-receive'],
    errorMessageKey: 'afterMessageReceiveScriptErrorMessage'
  },
  afterCallEnd: {
    label: 'After Call End',
    scriptType: SCRIPT_TYPES.AFTER_CALL_END,
    showHintsFor: ['bru', 'grpc:after-call-end'],
    errorMessageKey: 'afterCallEndScriptErrorMessage'
  }
};

const GrpcScript = ({ item, collection, handleRun }) => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  const request = item.draft ? item.draft.request : item.request;
  const panes = GRPC_SCRIPT_KEYS.map((hook) => ({
    hook,
    ...HOOKS[hook],
    code: get(request, `script.${hook}`, '')
  }));

  const scriptPaneTab = focusedTab?.scriptPaneTab;
  const selectedPane = panes.find((pane) => pane.scriptType === scriptPaneTab);
  // Open on whichever hook already has code, so a saved script isn't hidden behind a tab switch.
  const activeTab = (selectedPane || panes.find((pane) => pane.code?.trim().length) || panes[0]).scriptType;

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(tab) => dispatch(updateScriptPaneTab({ uid: item.uid, scriptPaneTab: tab }))}>
        <TabsList>
          {panes.map(({ hook, label, scriptType, code, errorMessageKey }) => (
            <TabsTrigger key={hook} value={scriptType}>
              {label}
              {code?.trim().length > 0 && <StatusDot type={item[errorMessageKey] ? 'error' : 'default'} />}
            </TabsTrigger>
          ))}
        </TabsList>

        {panes.map(({ hook, scriptType, showHintsFor, code }) => (
          <ScriptEditorPane
            key={hook}
            item={item}
            collection={collection}
            scriptType={scriptType}
            value={code}
            isActive={activeTab === scriptType}
            showHintsFor={showHintsFor}
            onEdit={(script) =>
              dispatch(updateGrpcScript({ hook, script, itemUid: item.uid, collectionUid: collection.uid }))}
            onRun={handleRun}
            onSave={onSave}
          />
        ))}
      </Tabs>
    </div>
  );
};

export default GrpcScript;
