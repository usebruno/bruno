/**
 * we maintain a cache of request uids to ensure that we
 * preserve the same uid for a request even when the request
 * moves to a different location
 *
 * In the past, we used to generate unique ids based on the
 * pathname of the request, but we faced problems when implementing
 * functionality where the user can move the request to a different
 * location. In that case, the uid would change, and the we would
 * lose the request's draft state if the user has made some changes
 */

const Store = require('electron-store');
const { uuid } = require('../utils/common');

// Using a electron-store object to avoid cache reset on every app launch.
// And to avoid with the persisted redux state.
let requestUids = new Store({
  name: 'requestUids',
  clearInvalidConfig: true
});

const getRequestUid = (pathname) => {
  let uid = requestUids.get(pathname);

  if (!uid) {
    uid = uuid();
    requestUids.set(pathname, uid);
  }

  return uid;
};

const moveRequestUid = (oldPathname, newPathname) => {
  const uid = requestUids.get(oldPathname);

  if (uid) {
    requestUids.delete(oldPathname);
    requestUids.set(newPathname, uid);
  }
};

const deleteRequestUid = (pathname) => {
  requestUids.delete(pathname);
};

module.exports = {
  getRequestUid,
  moveRequestUid,
  deleteRequestUid
};
