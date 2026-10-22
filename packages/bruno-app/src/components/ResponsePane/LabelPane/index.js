import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import Button from 'ui/Button';
import PdfPreview from '../PdfPreview';
import LabelDownloadButton from './LabelDownloadButton';
import { useZplLabelImage } from './useZplLabelImage/index';
import StyledWrapper from './StyledWrapper';

const DPMM_OPTIONS = [
  { value: 6, label: '152 dpi' },
  { value: 8, label: '203 dpi' },
  { value: 12, label: '300 dpi' },
  { value: 24, label: '600 dpi' }
];

const SIZE_OPTIONS = ['4x6', '4x4', '4x3', '4x2', '3x2', '2x1'];

const ZplLabel = ({ zpl, fileBase }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const consented = get(preferences, 'labelary.consent', false);
  const endpoint = get(preferences, 'labelary.endpoint', '');

  const [dpmm, setDpmm] = useState(8);
  const [size, setSize] = useState('4x6');
  const [widthInches, heightInches] = size.split('x').map(Number);
  const { status, image, error } = useZplLabelImage({ zpl, dpmm, widthInches, heightInches, enabled: consented });

  const allowRendering = () => {
    dispatch(savePreferences({ ...preferences, labelary: { ...preferences.labelary, consent: true } }));
  };

  return (
    <>
      <div className="label-toolbar flex items-center gap-2 px-3 py-2 text-xs">
        <select value={size} onChange={(e) => setSize(e.target.value)} data-testid="label-size-select">
          {SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option.replace('x', ' × ')} in</option>)}
        </select>
        <select value={dpmm} onChange={(e) => setDpmm(Number(e.target.value))} data-testid="label-dpi-select">
          {DPMM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <LabelDownloadButton label="Download ZPL" fileName={`${fileBase}.zpl`} content={zpl} encoding="utf8" testId="label-download-zpl" />
          {image ? (
            <LabelDownloadButton label="Download label image" fileName={`${fileBase}.png`} content={image} encoding="base64" testId="label-download-png" />
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3" data-testid="label-zpl-body">
        {!consented ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <span>
              Rendering a ZPL label sends its content to <strong>{endpoint}</strong>. Labels often contain names and addresses.
            </span>
            <Button size="sm" onClick={allowRendering} data-testid="label-allow-rendering">Allow and render</Button>
          </div>
        ) : null}
        {consented && status === 'loading' ? <span className="muted text-sm">Rendering label…</span> : null}
        {consented && status === 'error' ? <span className="error text-sm" data-testid="label-error">{error}</span> : null}
        {status === 'ready' ? <img className="label-image" src={`data:image/png;base64,${image}`} alt="ZPL label" data-testid="label-image" /> : null}
      </div>
    </>
  );
};

const LabelPane = ({ labels }) => {
  const [index, setIndex] = useState(0);
  const label = labels[Math.min(index, labels.length - 1)];
  const fileBase = `label-${index + 1}`;

  return (
    <StyledWrapper className="flex flex-col h-full w-1/2 shrink-0" data-testid="label-pane">
      {labels.length > 1 ? (
        <div className="label-toolbar flex items-center gap-2 px-3 py-2 text-xs">
          <button disabled={index === 0} onClick={() => setIndex(index - 1)} data-testid="label-prev">‹</button>
          <span>Label {index + 1} of {labels.length}</span>
          <button disabled={index >= labels.length - 1} onClick={() => setIndex(index + 1)} data-testid="label-next">›</button>
        </div>
      ) : null}
      {label.kind === 'pdf' ? (
        <>
          <div className="label-toolbar flex items-center justify-end px-3 py-2">
            <LabelDownloadButton label="Download PDF" fileName={`${fileBase}.pdf`} content={label.content} encoding="base64" testId="label-download-pdf" />
          </div>
          <div className="flex-1 overflow-auto" data-testid="label-pdf-body">
            <PdfPreview dataBuffer={label.content} />
          </div>
        </>
      ) : (
        <ZplLabel key={index} zpl={label.content} fileBase={fileBase} />
      )}
    </StyledWrapper>
  );
};

export default LabelPane;
