import { get } from 'lodash';
import { updateEncodeQuery } from 'providers/ReduxStore/slices/collections/index';
import { useDispatch } from 'react-redux';
import StyledWrapper from './StyledWrapper';
const EncodeQueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const encodeQuery = item.draft ? get(item, 'draft.request.encodeQuery') : get(item, 'request.encodeQuery');

  const onCheckboxChange = () => {
    dispatch(
      updateEncodeQuery({
        itemUid: item.uid,
        collectionUid: collection.uid,
        encodeQuery: !encodeQuery
      })
    );
  };

  return (
    <StyledWrapper>
      <div className="flex">
        <input id="encodeQuery" type="checkbox" name="encodeQuery" checked={encodeQuery} onChange={onCheckboxChange} />
        <label className="block ml-2 select-none label-item" htmlFor="encodeQuery">
          Encode query
        </label>
      </div>
    </StyledWrapper>
  );
};

export default EncodeQueryParams;
