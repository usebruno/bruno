import { useSelector } from 'react-redux';
import MonacoEditor from './Monaco';
import Codemirror from './Codemirror';
import SingleLineEditor from './Codemirror/SingleLineEditor';

const CodeEditor = ({
  collection,
  font,
  mode = 'plaintext',
  onChange,
  onRun,
  onSave,
  readOnly,
  theme,
  value,
  singleLine,
  withVariables = false,
  height = '60vh'
}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const forwardProps = {
    collection,
    font,
    mode,
    onChange,
    onRun,
    onSave,
    readOnly,
    theme,
    value,
    singleLine,
    withVariables,
    height
  };
  // const [withVariables, height, ...rest] = forwardProps
  return (preferences?.editor?.monaco) ? (
    <MonacoEditor {...forwardProps} />
  ) : (
    singleLine ? <SingleLineEditor {...forwardProps} /> : <Codemirror {...forwardProps} />
  )
}

export default CodeEditor;