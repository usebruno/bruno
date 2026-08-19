import { getBinaryPreviewType } from './index';

jest.mock('react-pdf', () => ({ Document: () => null, Page: () => null }));
jest.mock('pdfjs-dist/build/pdf.worker', () => ({}));
jest.mock('pdfjs-dist/build/pdf', () => ({ GlobalWorkerOptions: {} }));
jest.mock('react-pdf/dist/esm/Page/AnnotationLayer.css', () => ({}));
jest.mock('react-pdf/dist/esm/Page/TextLayer.css', () => ({}));
jest.mock('components/ResponsePane/QueryResult/QueryResultPreview/VideoPreview', () => () => null);

describe('getBinaryPreviewType', () => {
  it('maps pdf mime to pdf', () => {
    expect(getBinaryPreviewType('application/pdf')).toBe('pdf');
  });

  it('maps image mimes to image', () => {
    expect(getBinaryPreviewType('image/png')).toBe('image');
    expect(getBinaryPreviewType('image/jpeg')).toBe('image');
    expect(getBinaryPreviewType('image/webp')).toBe('image');
    expect(getBinaryPreviewType('image/gif')).toBe('image');
  });

  it('excludes svg (xml text) from image preview', () => {
    expect(getBinaryPreviewType('image/svg+xml')).toBe(null);
  });

  it('maps audio mimes to audio', () => {
    expect(getBinaryPreviewType('audio/mpeg')).toBe('audio');
    expect(getBinaryPreviewType('audio/wav')).toBe('audio');
  });

  it('maps video mimes to video', () => {
    expect(getBinaryPreviewType('video/mp4')).toBe('video');
    expect(getBinaryPreviewType('video/webm')).toBe('video');
  });

  it('returns null for text types and invalid input', () => {
    expect(getBinaryPreviewType('application/json')).toBe(null);
    expect(getBinaryPreviewType('text/plain')).toBe(null);
    expect(getBinaryPreviewType('')).toBe(null);
    expect(getBinaryPreviewType(undefined)).toBe(null);
    expect(getBinaryPreviewType(42)).toBe(null);
  });
});
