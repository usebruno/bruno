import { IconInfoCircle } from '@tabler/icons';
import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';

const BetaBadge = ({className = ""}) => {
  return (
    <span className={`inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-400/10 px-2 py-1 text-xs font-medium
     text-yellow-800 dark:text-yellow-500 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-400/20 ${className}`}>
        Beta
    </span>
  )
}

const BetaAlert = () => {
  return (
    <div className="rounded-md bg-blue-50 dark:bg-blue-600/10 p-3 ring-1 ring-inset ring-blue-400/30">
      <div className="flex">
        <div className="flex">
          <IconInfoCircle className="h-5 w-5 text-blue-400 dark:text-blue-400" aria-hidden="true" />
        </div>
        <div className="ml-2 flex-1 md:flex md:justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Monaco is a beta feature aiming to replace our current code editor.
            <br />
            Feel free to experiment with it and report our team any issue you may encounter.
          </p>
        </div>
      </div>
    </div>
  )
}
const EditorPreferences = ({ close }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const [editorPreferences, setEditorPreferences] = useState(preferences.editor ?? {
    monaco: false
  });
  const dispatch = useDispatch();
  const handleSave = useCallback(() => {
    dispatch(
      savePreferences({
        ...preferences,
        editor: {
          ...editorPreferences
        }
      })
    ).then(() => {
      close();
    }).catch((err) => console.log(err) && toast.error('Failed to update editor preferences'));
  }, [dispatch, preferences, editorPreferences]);
  return (
    <div className="flex flex-col w-full">
      <BetaAlert />
      <div className="flex flex-col mt-4">
        <div className="flex items-center">
          <input
            id="monacoEditorEnabled"
            type="checkbox"
            name="customCaCertificate.enabled"
            checked={editorPreferences.monaco}
            onChange={() => setEditorPreferences({
              ...preferences.editor,
              monaco: !editorPreferences.monaco
            })}
            className="mousetrap mr-0"
          />
          <label className="flex items-center ml-2 select-none" htmlFor="monacoEditorEnabled">
            Enable Monaco Editor
            <BetaBadge className="ml-2" />
          </label>
        </div>
      </div>
      <div className="mt-10">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  )
}
export default EditorPreferences;