import { useCallback } from 'react';
import { useSqliteMutation } from '@usebruno/sqlite/web';

const useClearStoredRunnerExchanges = (collectionUid) => {
  const { mutateAsync } = useSqliteMutation('delete_runner_responses_for_collection');

  return useCallback(async () => {
    try {
      await mutateAsync({ collection_uid: collectionUid });
    } catch (error) {
      console.error('Failed to clear stored runner payloads', error);
    }
  }, [mutateAsync, collectionUid]);
};

export default useClearStoredRunnerExchanges;
