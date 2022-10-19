import React, { useEffect } from "react"
import useIdb from "./useIdb"
import useLocalCollectionTreeSync from "./useLocalCollectionTreeSync"
import { useDispatch } from "react-redux"
import { refreshScreenWidth } from "providers/ReduxStore/slices/app"

export const AppContext = React.createContext()

export const AppProvider = (props) => {
  useIdb()
  useLocalCollectionTreeSync()

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(refreshScreenWidth())
  }, [])

  useEffect(() => {
    const handleResize = () => {
      dispatch(refreshScreenWidth())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <AppContext.Provider {...props} value="appProvider">
      {props.children}
    </AppContext.Provider>
  )
}

export default AppProvider
