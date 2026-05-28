import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './pages/index';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const rootElement = document.getElementById('root');

const Main = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `static/diff2html.min.css`;
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `static/diff2Html.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </React.StrictMode>
  );
};

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Main />);
}
