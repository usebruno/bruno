import Modal from "components/Modal/index";
import React, { useState } from "react";
import CreateEnvironment from "./CreateEnvironment";
import Layout from "./Layout";

const EnvironmentSettings = ({onClose}) => {
    const environments = [
      {name: "My env", uid: 123},
      {name: "hjdgfh dj", uid: 3876},
    ];
    const [openCreateModal, setOpenCreateModal] = useState(false)

    if(!environments.length) {
      return (
        <Modal
          size="lg"
          title="Environment"
          confirmText={"Close"}
          handleConfirm={onClose}
          hideCancel={true}
        >
          <p>No environment found!</p>
          <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={() => setOpenCreateModal(true)}>+ Create Environment</button>
          {openCreateModal && <CreateEnvironment onClose={() => setOpenCreateModal(false)}/>}
        </Modal>
      )
    }

  return (
    <Modal
      size="lg"
      title="Environment"
      confirmText={"Close"}
      handleCancel={onClose}
      hideFooter={true}
    >
      <Layout />
    </Modal>
  )

}

export default EnvironmentSettings;
