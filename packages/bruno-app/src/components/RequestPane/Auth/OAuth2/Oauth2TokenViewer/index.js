import { getOauth2Credentials } from "providers/ReduxStore/slices/collections/actions";
import { useEffect } from "react";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { interpolateStringUsingCollectionAndItem } from "utils/collections/index";

const Oauth2TokenViewer = ({ collection, item, url, credentialsId }) => {
  const dispatch = useDispatch();
  const [credentials, setCredentials] = useState({});
  const { uid: collectionUid } = collection;

  const fetchCredentials = async ({ collectionUid, url, credentialsId }) => {
    const interpolatedUrl = interpolateStringUsingCollectionAndItem({ collection, item, string: url });
    const storedCredentials = await dispatch(getOauth2Credentials({ url: interpolatedUrl, collectionUid, credentialsId }));
    console.log("stored credentials", storedCredentials);
    setCredentials(storedCredentials);
  }

  useEffect(() => {
    fetchCredentials({ collectionUid, url, credentialsId });
  }, [collectionUid, url, credentialsId, collection, item]);

  return (
    <div>
      {JSON.stringify(credentials)}
    </div>
  )
}

export default Oauth2TokenViewer;