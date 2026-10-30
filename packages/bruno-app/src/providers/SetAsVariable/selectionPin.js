let pinned = null;

export const pinSelection = (editor, payload, onRelease) => {
  releasePinnedSelection();
  if (editor && payload) {
    pinned = { editor, payload, onRelease };
  }
};

export const releasePinnedSelection = () => {
  const previous = pinned;
  pinned = null;
  previous?.onRelease?.();
};

export const getPinnedSelection = (editor) => (pinned?.editor === editor ? pinned.payload : null);

export const isSelectionPinned = (editor) => !!getPinnedSelection(editor);
