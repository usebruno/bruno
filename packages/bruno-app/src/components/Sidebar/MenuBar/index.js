import React, { useState } from "react"
import { useRouter } from "next/router"
import { IconCode, IconFiles, IconMoon, IconChevronsLeft, IconLifebuoy } from "@tabler/icons"
import { useDispatch } from "react-redux"
import { toggleLeftMenuBar } from "providers/ReduxStore/slices/app"
import { isElectron } from "utils/common/platform"

import Link from "next/link"
import StyledWrapper from "./StyledWrapper"
import BrunoSupport from "components/BrunoSupport"
import ThemeSwitcher from "components/ThemeSwitcher/index"

const MenuBar = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [openBrunoSupport, setOpenBrunoSupport] = useState(false)
  const [openThemeSwitcher, setOpenThemeSwitcher] = useState(false)
  const isPlatformElectron = isElectron()

  const getClassName = (menu) => {
    return router.pathname === menu ? "active menu-item" : "menu-item"
  }

  return (
    <StyledWrapper className="h-full flex flex-col">
      <div className="flex flex-col">
        <Link href="/">
          <div className={getClassName("/")}>
            <IconCode size={28} strokeWidth={1.5} />
          </div>
        </Link>
        {!isPlatformElectron ? (
          <Link href="/collections">
            <div className={getClassName("/collections")}>
              <IconFiles size={28} strokeWidth={1.5} />
            </div>
          </Link>
        ) : null}
        {/* <div className="menu-item">
          <IconUsers size={28} strokeWidth={1.5}/>
        </div> */}
      </div>
      <div className="flex flex-col flex-grow justify-end">
        {/* <Link href="/login">
          <div className="menu-item">
              <IconUser size={28} strokeWidth={1.5}/>
          </div>
        </Link> */}
        <div className="menu-item">
          <IconLifebuoy size={28} strokeWidth={1.5} onClick={() => setOpenBrunoSupport(true)} />
        </div>

        <div className="menu-item">
          <IconMoon size={28} strokeWidth={1.5} onClick={() => setOpenThemeSwitcher(true)} />
        </div>

        <div className="menu-item" onClick={() => dispatch(toggleLeftMenuBar())}>
          <IconChevronsLeft size={28} strokeWidth={1.5} />
        </div>
      </div>
      {openBrunoSupport && <BrunoSupport onClose={() => setOpenBrunoSupport(false)} />}
      {openThemeSwitcher && <ThemeSwitcher onClose={() => setOpenThemeSwitcher(false)} />}
    </StyledWrapper>
  )
}

export default MenuBar
