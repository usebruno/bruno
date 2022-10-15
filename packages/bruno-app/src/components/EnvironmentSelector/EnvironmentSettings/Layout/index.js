import React, { useEffect, useState, forwardRef, useRef } from "react";
import EnvironmentDetails from "./EnvironmentDetails";
import CreateEnvironment from "../CreateEnvironment/index";
import StyledWrapper from "./StyledWrapper";

const environments = [
  {name: "My env", uid: 123},
  {name: "hjdgfh dj", uid: 3876},
  {name: "hjdgfer dj", uid: 4678},
];

const Layout = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState({});
  const [openCreateModal, setOpenCreateModal] = useState(false);

  useEffect(() => {
    setSelectedEnvironment(environments[0]);
  }, []);

  return (
    <StyledWrapper>
      <div className="flex">
        <div style={{borderRight: "1px solid #ccc"}}>
          <div className="environments-sidebar">
            {environments && environments.length && environments.map((env) => (
              <div className={selectedEnvironment.uid === env.uid ? "environment-item active": "environment-item"}  onClick={() => setSelectedEnvironment(env)}>
                <span>{env.name}</span>
              </div>
            ))}
            <p className="create-env" onClick={() => setOpenCreateModal(true)}> + Create</p>
          </div>
        </div>
        <EnvironmentDetails selected={selectedEnvironment}/>
      </div>
      {openCreateModal && <CreateEnvironment onClose={() => setOpenCreateModal(false)}/>}
    </StyledWrapper>
  );
};

export default Layout;
