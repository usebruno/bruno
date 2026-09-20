import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadRequest } from 'providers/ReduxStore/slices/collections/actions';
import RequestIsLoading from '../RequestIsLoading';

// Requests are mounted as deferred tree nodes carrying only what the sidebar and the searches
// read. Opening one parses it in full; the parsed item arrives over main:collection-tree-updated,
// which clears `deferred` and replaces this view.
//
// A parse failure is surfaced as data — the main process sends the item back with `error` and
// `partial` set — so the rejected invoke needs no separate handling here.
const DeferredRequest = ({ item, collection }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadRequest({
      collectionUid: collection?.uid,
      pathname: item?.pathname
    })).catch(() => {});
  }, [dispatch, collection?.uid, item?.pathname]);

  return <RequestIsLoading item={item} />;
};

export default DeferredRequest;
