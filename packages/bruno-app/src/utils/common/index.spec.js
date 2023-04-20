const { describe, it, expect } = require("@jest/globals");

import { normalizeFileName } from './index';

describe("common utils", () => {
  describe("normalizeFileName", () => {
    it("should remove special characters", () => {
      expect(normalizeFileName("hello world")).toBe("hello world");
      expect(normalizeFileName("hello-world")).toBe("hello-world");
      expect(normalizeFileName("hello_world")).toBe("hello_world");
      expect(normalizeFileName("hello_world-")).toBe("hello_world-");
      expect(normalizeFileName("hello_world-123")).toBe("hello_world-123");
      expect(normalizeFileName("hello_world-123!@#$%^&*()")).toBe("hello_world-123----------");
      expect(normalizeFileName("hello_world?")).toBe("hello_world-");
      expect(normalizeFileName("foo/bar/")).toBe("foo-bar-");
      expect(normalizeFileName("foo\\bar\\")).toBe("foo-bar-");
    });
  });
});