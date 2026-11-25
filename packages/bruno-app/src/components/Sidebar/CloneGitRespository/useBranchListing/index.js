import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchBranchesForRepositoryUrl } from 'providers/ReduxStore/slices/collections/actions';
import useDebounce from 'hooks/useDebounce';

export const EMPTY_BRANCH_LISTING = { branches: [], defaultBranch: '', loading: false, failed: false };

const useBranchListing = (url, { canList }) => {
  const dispatch = useDispatch();
  const debouncedUrl = useDebounce(url, 500);
  const [listing, setListing] = useState(EMPTY_BRANCH_LISTING);
  // replies for older URLs are dropped
  const latestUrlRef = useRef(null);

  useEffect(() => {
    if (!canList(debouncedUrl)) {
      return;
    }
    latestUrlRef.current = debouncedUrl;
    setListing({ ...EMPTY_BRANCH_LISTING, loading: true });
    dispatch(fetchBranchesForRepositoryUrl(debouncedUrl))
      .then(({ branches, defaultBranch }) => {
        if (latestUrlRef.current === debouncedUrl) {
          setListing({ branches, defaultBranch: defaultBranch || '', loading: false, failed: false });
        }
      })
      .catch((error) => {
        if (latestUrlRef.current === debouncedUrl) {
          console.error(error);
          setListing({ ...EMPTY_BRANCH_LISTING, failed: true });
        }
      });
  }, [debouncedUrl]);

  // hide the previous URL's branches while the new URL is debouncing
  if (url !== debouncedUrl) {
    return { ...EMPTY_BRANCH_LISTING, loading: canList(url) };
  }
  return canList(debouncedUrl) ? listing : EMPTY_BRANCH_LISTING;
};

export default useBranchListing;
