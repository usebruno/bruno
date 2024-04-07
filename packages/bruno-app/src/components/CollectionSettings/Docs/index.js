import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import { updateCollectionDocs } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import MarkDownEditor from 'components/MarkDownEditor';
import StyledWrapper from './StyledWrapper';

const Docs = ({ collection }) => {
  const dispatch = useDispatch();
  const defaultDocs =
    "This collection doesn't have any documentation yet!\n\n\n---\n\n" +
    '*To get started, either quadruple-click this text, or select the ' +
    '`Edit` button in the bottom right corner to start editing.*';
  const docs = get(collection, 'root.docs', null);

  const onEdit = (value) => {
    console.log('onEdit', value);
    dispatch(
      updateCollectionDocs({
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => {
    console.log('onSave');
    dispatch(saveCollectionRoot(collection.uid));
  };

  return (
    <StyledWrapper className="h-full w-full">
      <MarkDownEditor
        collection={collection}
        content={docs}
        defaultContent={defaultDocs}
        onEdit={onEdit}
        onSave={onSave}
      />
    </StyledWrapper>
  );
};

export default Docs;
