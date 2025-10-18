/**
 * we maintain a cache of request uids to ensure that we
 * preserve the same uid for a request even when the request
 * moves to a different location
 *
 * In the past, we used to generate unique ids based on the
 * pathname of the request, but we faced problems when implementing
 * functionality where the user can move the request to a different
 * location. In that case, the uid would change, and we would
 * lose the request's draft state if the user has made some changes
 */

const requestUids = new Map();
const exampleUids = new Map();
const { uuid } = require('../utils/common');

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

const getExampleUid = (pathname, index) => {
  let uid = exampleUids.get(`${pathname}-${index}`);

  if (!uid) {
    uid = uuid();
    exampleUids.set(`${pathname}-${index}`, uid);
  }

  return uid;
};

module.exports = {
  getRequestUid,
  moveRequestUid,
  deleteRequestUid,
  getExampleUid
};
