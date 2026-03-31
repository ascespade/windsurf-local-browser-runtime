import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeForwardedUrl, buildLocalUrl, extractPort } from '../index.js';

describe('URL Bridge', () => {
  describe('normalizeForwardedUrl', () => {
    test('should replace 0.0.0.0 with 127.0.0.1', () => {
      assert.equal(
        normalizeForwardedUrl('http://0.0.0.0:3000'),
        'http://127.0.0.1:3000',
      );
    });

    test('should replace localhost with 127.0.0.1', () => {
      assert.equal(
        normalizeForwardedUrl('http://localhost:8080'),
        'http://127.0.0.1:8080',
      );
    });

    test('should not modify URLs with other hosts', () => {
      assert.equal(
        normalizeForwardedUrl('http://example.com:3000'),
        'http://example.com:3000',
      );
    });

    test('should handle URLs with paths', () => {
      assert.equal(
        normalizeForwardedUrl('http://0.0.0.0:3000/api'),
        'http://127.0.0.1:3000/api',
      );
    });

    test('should handle https protocol', () => {
      assert.equal(
        normalizeForwardedUrl('https://localhost:443'),
        'https://127.0.0.1:443',
      );
    });

    test('should handle URLs without port', () => {
      assert.equal(
        normalizeForwardedUrl('http://localhost'),
        'http://127.0.0.1',
      );
    });

    test('should handle empty string', () => {
      assert.equal(normalizeForwardedUrl(''), '');
    });

    test('should replace all occurrences of 0.0.0.0 and localhost', () => {
      const result = normalizeForwardedUrl('http://0.0.0.0:3000/localhost');
      assert.equal(result, 'http://127.0.0.1:3000/127.0.0.1');
    });
  });

  describe('buildLocalUrl', () => {
    test('should build http URL with default host', () => {
      assert.equal(buildLocalUrl(3000), 'http://127.0.0.1:3000');
    });

    test('should build https URL when specified', () => {
      assert.equal(buildLocalUrl(443, 'https'), 'https://127.0.0.1:443');
    });

    test('should accept custom host', () => {
      assert.equal(
        buildLocalUrl(8080, 'http', '0.0.0.0'),
        'http://0.0.0.0:8080',
      );
    });

    test('should handle port 80', () => {
      assert.equal(buildLocalUrl(80), 'http://127.0.0.1:80');
    });

    test('should handle high port numbers', () => {
      assert.equal(buildLocalUrl(65535), 'http://127.0.0.1:65535');
    });

    test('should handle port 0', () => {
      assert.equal(buildLocalUrl(0), 'http://127.0.0.1:0');
    });
  });

  describe('extractPort', () => {
    test('should extract port from http URL', () => {
      assert.equal(extractPort('http://localhost:3000'), 3000);
    });

    test('should extract port from https URL', () => {
      assert.equal(extractPort('https://example.com:8443'), 8443);
    });

    test('should return undefined for URL without port', () => {
      assert.equal(extractPort('http://localhost'), undefined);
    });

    test('should return undefined for invalid URL', () => {
      assert.equal(extractPort('not-a-url'), undefined);
    });

    test('should return undefined for empty string', () => {
      assert.equal(extractPort(''), undefined);
    });

    test('should handle URL with path and port', () => {
      assert.equal(extractPort('http://localhost:8080/api/v1'), 8080);
    });

    test('should return undefined for default https port (443)', () => {
      assert.equal(extractPort('https://secure.example.com:443'), undefined);
    });

    test('should return undefined for URL with only colon', () => {
      assert.equal(extractPort('http://localhost:'), undefined);
    });
  });
});
