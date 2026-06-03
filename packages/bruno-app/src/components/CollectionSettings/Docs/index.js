import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateCollectionDocs, deleteCollectionDraft } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { IconEdit, IconX, IconFileText } from '@tabler/icons';
import Button from 'ui/Button/index';
import ActionIcon from 'ui/ActionIcon/index';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const Docs = ({ collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const docs = collection.draft?.root ? get(collection, 'draft.root.docs', '') : get(collection, 'root.docs', '');
  const preferences = useSelector((state) => state.app.preferences);

  // StyledWrapper has overflow-y: auto — use null selector.
  // Preview mode: hook tracks wrapper scroll. Edit mode: CodeEditor's onScroll/initialScroll.
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `collection-docs-scroll-${collection.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, onChange: setScroll, enabled: !isEditing, initialValue: scroll });

  const toggleViewMode = () => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: !isEditing }));
  };

  const onEdit = (value) => {
    dispatch(
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const handleDiscardChanges = () => {
    dispatch((
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: docs
      }))
    );
    toggleViewMode();
  };

  const onSave = () => {
    dispatch(saveCollectionSettings(collection.uid));
    toggleViewMode();
  };

  return (
    <StyledWrapper className="h-full w-full relative flex flex-col" ref={wrapperRef}>
      <div className="flex flex-row w-full justify-between items-center mb-4">
        <div className="text-lg font-medium flex items-center gap-2">
          <IconFileText size={20} strokeWidth={1.5} />
          Documentation
        </div>
        <div className="flex flex-row gap-2 items-center justify-center">
          {isEditing ? (
            <>
              <Button type="button" color="secondary" onClick={handleDiscardChanges}>
                {t('COMMON.CANCEL')}
              </Button>
              <Button type="button" onClick={onSave}>
                {t('COMMON.SAVE')}
              </Button>
            </>
          ) : (
            <ActionIcon className="editing-mode" onClick={toggleViewMode}>
              <IconEdit className="cursor-pointer" size={16} strokeWidth={1.5} />
            </ActionIcon>
          )}
        </div>
      </div>
      {isEditing ? (
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          value={docs}
          onEdit={onEdit}
          onSave={onSave}
          mode="application/text"
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          initialScroll={scroll}
          onScroll={setScroll}
        />
      ) : (
        <div className="pl-1 h-full">
          {
            docs?.length > 0
              ? <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
              : <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={documentationPlaceholder} />
          }
        </div>
      )}
    </StyledWrapper>
  );
};

export default Docs;

const documentationPlaceholder = `
欢迎来到您的集合文档！此空间旨在帮助您有效地记录 API 集合。

## 概述
使用此部分提供集合的高级概述。您可以描述：
- 这些 API 端点的用途
- 主要特性和功能
- 目标受众或用户

## 最佳实践
- 保持文档最新
- 包含请求/响应示例
- 记录错误场景
- 添加相关链接和参考资料

## Markdown 支持
此文档支持 Markdown 格式！您可以使用：
- **粗体** 和 *斜体* 文本
- \`代码块\` 和语法高亮
- 表格和列表
- [链接](https://usebruno.com)
- 以及更多！
`;
