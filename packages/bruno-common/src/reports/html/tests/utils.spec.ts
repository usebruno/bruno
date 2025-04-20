import { decodeBase64, encodeBase64 } from "../utils";
import { decodedIterationsDataString, encodedIterationsDataString } from "./fixtures/iteration-data-encoded-decoded-strings";

describe('should encode/decode iterations data string correctly', () => {
  it('should encode iterations data string correctly', () => {
    const encoded = encodeBase64(decodedIterationsDataString);
    expect(encoded).toBeDefined();
    expect(encoded).toEqual(encodedIterationsDataString);
  });

  it('should decode iterations data string correctly', () => {
    const decoded = decodeBase64(encodedIterationsDataString);
    expect(decoded).toBeDefined();
    expect(decoded).toEqual(decodedIterationsDataString);
  });
});