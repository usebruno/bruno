import React, { useState } from 'react';
import get from 'lodash/get';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import Select from 'ui/Select';
import PdfPreview from '../PdfPreview';
import LabelDownloadButton from './LabelDownloadButton';
import { useZplLabelImage } from './useZplLabelImage';
import StyledWrapper from './StyledWrapper';

const DPMM_OPTIONS = [
  { value: '6', label: '152 dpi' },
  { value: '8', label: '203 dpi' },
  { value: '12', label: '300 dpi' },
  { value: '24', label: '600 dpi' }
];

const SIZE_OPTIONS = ['4x6', '4x4', '4x3', '4x2', '3x2', '2x1'].map((size) => ({ value: size, label: `${size.replace('x', ' × ')} in` }));

const ZplLabel = ({ zpl, fileBase }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const endpoint = get(preferences, 'labelary.endpoint', '');
  // Same rule as renderZplLabel in bruno-electron/src/ipc/label-render.js, which enforces it; keep the two in sync
  const consented = endpoint !== '' && get(preferences, 'labelary.consentedEndpoint', '') === endpoint;

  const [dpmm, setDpmm] = useState('8');
  const [size, setSize] = useState('4x6');
  const [widthInches, heightInches] = size.split('x').map(Number);
  const { status, image, error } = useZplLabelImage({ zpl, dpmm: Number(dpmm), widthInches, heightInches, endpoint, enabled: consented });

  const allowRendering = () => {
    dispatch(savePreferences({ ...preferences, labelary: { ...preferences.labelary, consentedEndpoint: endpoint } }))
      .catch((err) => toast.error(err.message || 'Failed to save the render consent'));
  };

  return (
    <>
      <div className="label-toolbar flex items-center gap-2 px-3 py-2 text-xs">
        <div className="w-28">
          <Select data={SIZE_OPTIONS} value={size} onChange={setSize} allowDeselect={false} size="sm" data-testid="label-size-select" />
        </div>
        <div className="w-28">
          <Select data={DPMM_OPTIONS} value={dpmm} onChange={setDpmm} allowDeselect={false} size="sm" data-testid="label-dpi-select" />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <LabelDownloadButton tooltip="Download ZPL" fileName={`${fileBase}.zpl`} content={zpl} encoding="utf8" testId="label-download-zpl" />
          {image ? (
            <LabelDownloadButton tooltip="Download label image" fileName={`${fileBase}.png`} content={image} encoding="base64" testId="label-download-png" />
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
  // A re-sent request can return fewer labels than the page the user was on
  const current = Math.min(index, labels.length - 1);
  const label = labels[current];
  const fileBase = `label-${current + 1}`;

  return (
    <StyledWrapper className="flex flex-col h-full w-1/2 shrink-0" data-testid="label-pane">
      {labels.length > 1 ? (
        <div className="label-toolbar flex items-center gap-2 px-3 py-2 text-xs">
          <ActionIcon label="Previous label" disabled={current === 0} onClick={() => setIndex(current - 1)} data-testid="label-prev">
            <IconChevronLeft size={16} strokeWidth={2} />
          </ActionIcon>
          <span data-testid="label-position">Label {current + 1} of {labels.length}</span>
          <ActionIcon label="Next label" disabled={current >= labels.length - 1} onClick={() => setIndex(current + 1)} data-testid="label-next">
            <IconChevronRight size={16} strokeWidth={2} />
          </ActionIcon>
        </div>
      ) : null}
      {label.kind === 'pdf' ? (
        <>
          <div className="label-toolbar flex items-center justify-end px-3 py-2">
            <LabelDownloadButton tooltip="Download PDF" fileName={`${fileBase}.pdf`} content={label.content} encoding="base64" testId="label-download-pdf" />
          </div>
          <div className="flex-1 overflow-auto" data-testid="label-pdf-body">
            <PdfPreview dataBuffer={label.content} />
          </div>
        </>
      ) : (
        <ZplLabel key={current} zpl={label.content} fileBase={fileBase} />
      )}
    </StyledWrapper>
  );
};

export default LabelPane;
