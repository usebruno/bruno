import { describe, it, expect } from '@jest/globals';
import wsdlToBruno from '../../src/wsdl/wsdl-to-bruno.js';

describe('wsdl-to-bruno', () => {
  it('should throw error for non-string input', async () => {
    await expect(wsdlToBruno({})).rejects.toThrow('WSDL content must be a string');
  });

  it('should throw error for empty string input', async () => {
    await expect(wsdlToBruno('')).rejects.toThrow('Import WSDL collection failed');
  });

  it('should throw error for invalid XML', async () => {
    await expect(wsdlToBruno('<invalid>xml</invalid>')).rejects.toThrow('Import WSDL collection failed');
  });
});
