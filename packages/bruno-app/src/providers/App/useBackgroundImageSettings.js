import { useEffect, useRef, useState } from 'react';
import { DEFAULT_BACKGROUND_DISPLAY } from '@usebruno/common';
import toast from 'react-hot-toast';

const invoke = (action, ...args) => window.ipcRenderer.invoke(`renderer:background-image:${action}`, ...args);

async function decodeImage(image) {
  if (!image) return null;
  const url = URL.createObjectURL(new Blob([image.bytes], { type: image.type }));
  const preview = new Image();
  preview.src = url;
  try {
    await preview.decode();
    return url;
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

export default function useBackgroundImageSettings() {
  const [asset, setAsset] = useState({ fileName: null, url: null });
  const { url } = asset;
  const [display, setDisplay] = useState(DEFAULT_BACKGROUND_DISPLAY);
  const [busy, setBusy] = useState(true);
  const currentDisplay = useRef(DEFAULT_BACKGROUND_DISPLAY);
  const savedDisplay = useRef(DEFAULT_BACKGROUND_DISPLAY);
  const saveTimer = useRef(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const snapshot = await invoke('load');
        const url = await decodeImage(snapshot.image);
        if (disposed) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setAsset({ fileName: snapshot.fileName, url });
        currentDisplay.current = snapshot.display;
        savedDisplay.current = snapshot.display;
        setDisplay(snapshot.display);
      } catch (error) {
        if (!disposed) toast.error(`Could not load background settings. ${error.message}`);
      } finally {
        if (!disposed) setBusy(false);
      }
    };
    load();
    return () => {
      disposed = true;
      clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const changeImage = async (action) => {
    setBusy(true);
    try {
      const result = await invoke(action);
      if (action === 'clear') {
        setAsset({ fileName: null, url: null });
      } else if (result) {
        setAsset({ fileName: result.fileName, url: await decodeImage(result.image) });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDisplay = async () => {
    if (saveTimer.current === null) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const next = currentDisplay.current;
    try {
      await invoke('display', next);
      savedDisplay.current = next;
    } catch (error) {
      if (currentDisplay.current === next) {
        currentDisplay.current = savedDisplay.current;
        setDisplay(savedDisplay.current);
      }
      toast.error(`Could not save background settings. ${error.message}`);
    }
  };

  const changeDisplay = (patch) => {
    const next = { ...currentDisplay.current, ...patch };
    currentDisplay.current = next;
    setDisplay(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveDisplay, 200);
  };

  return {
    fileName: asset.fileName,
    url,
    busy,
    display,
    changeImage,
    changeDisplay,
    saveDisplay
  };
}
