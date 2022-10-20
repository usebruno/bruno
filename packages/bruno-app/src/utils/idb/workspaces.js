import isArray from "lodash/isArray";

export const saveWorkspaceToIdb = (connection, workspace) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction(`workspace`, "readwrite");
        let workspaceStore = tx.objectStore("workspace");

        if (isArray(workspace)) {
          for (let c of workspace) {
            workspaceStore.put(c);
          }
        } else {
          workspaceStore.put(workspace);
        }

        return new Promise((res, rej) => {
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      })
      .then(resolve)
      .catch((err) => reject(err));
  });
};

export const deleteWorkspaceInIdb = (connection, workspaceUid) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction(`workspace`, "readwrite");
        tx.objectStore("workspace").delete(workspaceUid);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
      .catch((err) => reject(err));
  });
};

export const getWorkspacesFromIdb = (connection) => {
  return new Promise((resolve, reject) => {
    connection
      .then((db) => {
        let tx = db.transaction("workspace");
        let workspaceStore = tx.objectStore("workspace");
        return workspaceStore.getAll();
      })
      .then((workspaces) => {
        if (!Array.isArray(workspaces)) {
          return new Error("IDB Corrupted");
        }

        return resolve(workspaces);
      })
      .catch((err) => reject(err));
  });
};
