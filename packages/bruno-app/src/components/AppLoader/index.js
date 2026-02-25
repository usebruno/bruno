import React from 'react';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';

const AppLoader = () => {
  const { theme } = useTheme();
  const message = useSelector((state) => state.app.snapshotRestoreMessage);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.sidebar.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${theme.border.border1}`,
          borderTopColor: theme.colors.text.yellow,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}
      </style>
      <p style={{ marginTop: '16px', color: theme.sidebar.color, fontSize: '14px' }}>
        {message || 'Restoring session...'}
      </p>
    </div>
  );
};

export default AppLoader;
