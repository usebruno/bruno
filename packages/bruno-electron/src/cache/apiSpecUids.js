/**
 * we maintain a cache of apiSpec uids to ensure that we
 * preserve the same uid for a apiSpec even when the apiSpec
 * moves to a different location
 *
 * In the past, we used to generate unique ids based on the
 * pathname of the apiSpec, but we faced problems when implementing
 * functionality where the user can move the apiSpec to a different
 * location. In that case, the uid would change, and the we would
 * lose the apiSpec's draft state if the user has made some changes
 */

const apiSpecUids = new Map();
const { uuid } = require('../utils/common');

const getApiSpecUid = (pathname) => {
  let uid = apiSpecUids.get(pathname);

  if (!uid) {
    uid = uuid();
    apiSpecUids.set(pathname, uid);
  }

  return uid;
};

const moveApiSpecUid = (oldPathname, newPathname) => {
  const uid = apiSpecUids.get(oldPathname);

  if (uid) {
    apiSpecUids.delete(oldPathname);
    apiSpecUids.set(newPathname, uid);
  }
};

const removeApiSpecUid = (pathname) => {
  apiSpecUids.delete(pathname);
};

module.exports = {
  getApiSpecUid,
  moveApiSpecUid,
  removeApiSpecUid
};
