export const setDragPreview = (e, label) => {
  const preview = document.createElement('div');
  preview.textContent = label || '';
  preview.style.cssText = `
    position: fixed;
    top: -1000px;
    left: -1000px;
    padding: 4px 10px;
    border-radius: 4px;
    background: rgba(30, 30, 30, 0.9);
    color: #fff;
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
  `;
  document.body.appendChild(preview);
  e.dataTransfer.setDragImage(preview, 10, 10);
  setTimeout(() => preview.remove(), 0);
};
