const fileUids = new Map();
const { uuid } = require('../utils/common');

const getFileUid = (pathname) => {
  let uid = fileUids.get(pathname);

  if (!uid) {
    uid = uuid();
    fileUids.set(pathname, uid);
  }

  return uid;
};

const moveFileUid = (oldPathname, newPathname) => {
  const uid = fileUids.get(oldPathname);

  if (uid) {
    fileUids.delete(oldPathname);
    fileUids.set(newPathname, uid);
  }
};

const deleteFileUid = (pathname) => {
  fileUids.delete(pathname);
};

module.exports = {
  getFileUid,
  moveFileUid,
  deleteFileUid
};
