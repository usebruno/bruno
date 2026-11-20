import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconVariable } from '@tabler/icons';
import IconSparkles from 'components/Icons/IconSparkles';
import { showAiSidebar, showVariablesSidebar } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';

const RightSidebarSwitcher = ({ active }) => {
  const dispatch = useDispatch();
  const isAiEnabled = useSelector((state) => get(state.app.preferences, 'ai.enabled', false));

  const panels = [
    { key: 'variables', label: 'Variables', Icon: IconVariable, onShow: () => dispatch(showVariablesSidebar()) },
    ...(isAiEnabled ? [{ key: 'ai', label: 'AI Assistant', Icon: IconSparkles, onShow: () => dispatch(showAiSidebar()) }] : [])
  ];

  return (
    <StyledWrapper role="group" aria-label="Sidebar panels" data-testid="right-sidebar-switcher">
      {panels.map(({ key, label, Icon, onShow }) => (
        <button
          key={key}
          type="button"
          className={`switch-btn ${active === key ? 'is-active' : ''}`}
          aria-label={label}
          aria-pressed={active === key}
          title={label}
          onClick={active === key ? undefined : onShow}
          data-testid={`right-sidebar-switch-${key}`}
        >
          <Icon size={16} strokeWidth={1.5} />
        </button>
      ))}
    </StyledWrapper>
  );
};

export default RightSidebarSwitcher;
