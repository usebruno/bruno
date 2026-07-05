import React from 'react';
import styled from 'styled-components';
import { IconAppWindow } from '@tabler/icons';

const Wrapper = styled.div`
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${(props) => props.theme.border.border1};
  border-radius: 4px;
  background: ${(props) => props.theme.background.surface0};
  color: ${(props) => props.theme.colors.text.muted};

  .empty-app-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    text-align: center;
    max-width: 360px;
  }

  .empty-app-title {
    font-size: 13px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .empty-app-hint {
    font-size: 12px;
    line-height: 1.4;
  }
`;

const EmptyAppState = ({ title = 'No app yet', hint }) => (
  <Wrapper data-testid="empty-app-state">
    <div className="empty-app-inner">
      <IconAppWindow size={32} strokeWidth={1.25} />
      <div className="empty-app-title">{title}</div>
      {hint ? <div className="empty-app-hint">{hint}</div> : null}
    </div>
  </Wrapper>
);

export default EmptyAppState;
