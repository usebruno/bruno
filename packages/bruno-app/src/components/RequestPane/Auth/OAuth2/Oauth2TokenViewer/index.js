import { find } from "lodash";
import { useTheme } from "providers/Theme/index";
import { interpolateStringUsingCollectionAndItem } from "utils/collections/index";
import { ObjectInspector, chromeDark, chromeLight } from 'react-inspector';
import StyledWrapper from "./StyledWrapper";

const Oauth2TokenViewer = ({ collection, item, url, credentialsId, handleRun }) => {
  const { uid: collectionUid } = collection;
  const { displayedTheme } = useTheme();
 

  const interpolatedUrl = interpolateStringUsingCollectionAndItem({ collection, item, string: url });
  const credentialsData = find(collection?.oauth2Credentials, creds => creds?.url == interpolatedUrl && creds?.collectionUid == collectionUid && creds?.credentialsId == credentialsId);

  const reactInspectorTheme = {
    ...(displayedTheme == 'light' ? {...chromeLight} : {...chromeDark}),
    BASE_FONT_SIZE: '14px',
    TREENODE_FONT_FAMILY: 'monospace',
    TREENODE_FONT_SIZE: '14px',
    TREENODE_LINE_HEIGHT: '1.5em',
    TREENODE_PADDING_LEFT: 20
  }

  return (
    <StyledWrapper className="relative w-auto h-fit">
      {
        credentialsData?.credentials ?
          <ObjectInspector
            data={credentialsData?.credentials}
            theme={reactInspectorTheme}
          />
          :
          <div className="opacity-50">No token found</div>
      }
    </StyledWrapper>
  )
}

export default Oauth2TokenViewer;