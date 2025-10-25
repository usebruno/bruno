import { useState, useCallback } from 'react';
import { uuid } from 'utils/common';

export function useParamAddAutoFocusIntent() {
  const [pending, setPending] = useState(null);

  const uidSetter = useCallback((id) => setPending(id), []);
  const inputRef = useCallback((id) => (el) => {
    if (!el) return;
    if (pending !== id) return;
    el.focus();
    setPending(null);
  },
  [pending]);

  return { uidSetter, inputRef };
}

export function addWithAutoFocus(uidSetter, dispatch, actionMethod, payload) {
  const uid = uuid();
  uidSetter(uid);
  dispatch(actionMethod({ ...payload, paramUid: uid }));
}
