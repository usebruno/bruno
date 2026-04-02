import React, { useState, useEffect, useRef, useCallback } from 'react';

const LazyEditorCell = ({ value, placeholder, children }) => {
  const [isActive, setIsActive] = useState(false);
  const ref = useRef(null);

  const activate = useCallback(() => setIsActive(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isActive) {
    return children;
  }

  return (
    <div
      ref={ref}
      className="lazy-editor-placeholder"
      onClick={activate}
      onMouseEnter={activate}
      onFocus={activate}
    >
      <input
        type="text"
        readOnly
        tabIndex={0}
        value={value || ''}
        placeholder={placeholder || ''}
        onFocus={activate}
        onChange={() => {}}
      />
    </div>
  );
};

export default LazyEditorCell;
