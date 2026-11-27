import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchBranchesForRepositoryUrl } from 'providers/ReduxStore/slices/collections/actions';
import useDebounce from 'hooks/useDebounce';

export const EMPTY_BRANCH_LISTING = { branches: [], defaultBranch: '', loading: false, failed: false };
const LOADING_BRANCH_LISTING = { ...EMPTY_BRANCH_LISTING, loading: true };

const useBranchListing = (url, { canList }) => {
  const dispatch = useDispatch();
  const debouncedUrl = useDebounce(url, 500);
  const [listing, setListing] = useState({ url: null, value: EMPTY_BRANCH_LISTING });
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!canList(debouncedUrl)) {
      return;
    }
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    setListing({ url: debouncedUrl, value: LOADING_BRANCH_LISTING });
    dispatch(fetchBranchesForRepositoryUrl(debouncedUrl))
      .then(({ branches, defaultBranch }) => {
        if (latestRequestRef.current === requestId) {
          setListing({ url: debouncedUrl, value: { branches, defaultBranch: defaultBranch || '', loading: false, failed: false } });
        }
      })
      .catch((error) => {
        if (latestRequestRef.current === requestId) {
          console.error(error);
          setListing({ url: debouncedUrl, value: { ...EMPTY_BRANCH_LISTING, failed: true } });
        }
      });
  }, [debouncedUrl]);

  if (!canList(url)) {
    return EMPTY_BRANCH_LISTING;
  }
  return url === debouncedUrl && listing.url === url ? listing.value : LOADING_BRANCH_LISTING;
};

export default useBranchListing;
