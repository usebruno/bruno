import { useEffect } from "react";
import Modal from "components/Modal/index";
import StyledWrapper from "./StyledWrapper";
import useLocalStorage from "src/hooks/useLocalStorage";

import { IconMoon } from "@tabler/icons";
import { useDispatch, useSelector } from "react-redux";
import { updateTheme } from "providers/ReduxStore/slices/app";

const ThemeSwitcher = ({ onClose }) => {
  const dispatch = useDispatch();
  const [storedTheme, setStoredTheme] = useLocalStorage("THEME", "light");
  const options = [
    { title: "Light", value: "light" },
    { title: "Dark", value: "dark" },
  ];

  useEffect(() => {
    dispatch(updateTheme({ theme: storedTheme }));
  }, [storedTheme]);

  const handleThemeChange = (e) => {
    const { value } = e.target;

    setStoredTheme(value);
    dispatch(updateTheme({ theme: value }));
  };

  return (
    <StyledWrapper>
      <Modal size="sm" title={"Theme Switcher"} handleCancel={onClose} hideFooter={true}>
        <div className="collection-options">
          <div>
            <div className="flex items-center">
              <IconMoon size={18} />
              <select name="theme_switcher" onChange={handleThemeChange}>
                {options.map((op) => {
                  const { value, title } = op;
                  return (
                    <option value={value} selected={value == storedTheme}>
                      {title}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default ThemeSwitcher;
