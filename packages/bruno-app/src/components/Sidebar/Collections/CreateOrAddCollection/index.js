import React, { useState } from "react"
import toast from "react-hot-toast"
import { useSelector, useDispatch } from "react-redux"
import CreateCollection from "components/Sidebar/CreateCollection"
import SelectCollection from "components/Sidebar/Collections/SelectCollection"
import { createCollection } from "providers/ReduxStore/slices/collections/actions"
import { addCollectionToWorkspace } from "providers/ReduxStore/slices/workspaces/actions"

const CreateOrAddCollection = () => {
  const dispatch = useDispatch()
  const [createCollectionModalOpen, setCreateCollectionModalOpen] = useState(false)
  const [addCollectionToWSModalOpen, setAddCollectionToWSModalOpen] = useState(false)
  const { activeWorkspaceUid } = useSelector((state) => state.workspaces)

  const handleCreateCollection = (values) => {
    setCreateCollectionModalOpen(false)
    dispatch(createCollection(values.collectionName))
      .then(() => {
        toast.success("Collection created")
      })
      .catch(() => toast.error("An error occured while creating the collection"))
  }

  const handleAddCollectionToWorkspace = (collectionUid) => {
    setAddCollectionToWSModalOpen(false)
    dispatch(addCollectionToWorkspace(activeWorkspaceUid, collectionUid))
      .then(() => {
        toast.success("Collection added to workspace")
      })
      .catch(() => toast.error("An error occured while adding collection to workspace"))
  }

  const CreateLink = () => (
    <span className="underline text-link cursor-pointer" onClick={() => setCreateCollectionModalOpen(true)}>
      Create
    </span>
  )
  const AddLink = () => (
    <span className="underline text-link cursor-pointer" onClick={() => setAddCollectionToWSModalOpen(true)}>
      Add
    </span>
  )

  return (
    <div className="px-2 mt-4 text-gray-600">
      {createCollectionModalOpen ? <CreateCollection handleCancel={() => setCreateCollectionModalOpen(false)} handleConfirm={handleCreateCollection} /> : null}

      {addCollectionToWSModalOpen ? (
        <SelectCollection title="Add Collection to Workspace" onClose={() => setAddCollectionToWSModalOpen(false)} onSelect={handleAddCollectionToWorkspace} />
      ) : null}

      <div className="text-xs text-center secondary-text">
        <div>No collections found.</div>
        <div className="mt-2">
          <CreateLink /> or <AddLink /> Collection to Workspace.
        </div>
      </div>
    </div>
  )
}

export default CreateOrAddCollection
