import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { assertPublicUrl } from './ssrf-guard';

jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn(),
  },
}));

import { promises as dns } from 'dns';
const mockResolve4 = dns.resolve4 as jest.MockedFunction<typeof dns.resolve4>;

describe('assertPublicUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves valid public URL', async () => {
    mockResolve4.mockResolvedValueOnce(['93.184.216.34']);
    const result = await assertPublicUrl('https://example.com/feed');
    expect(result.hostname).toBe('example.com');
  });

  it('throws BadRequestException for invalid URL format', async () => {
    await expect(assertPublicUrl('not-a-url')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for ftp protocol', async () => {
    await expect(assertPublicUrl('ftp://example.com/feed')).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException for loopback 127.0.0.1', async () => {
    await expect(assertPublicUrl('http://127.0.0.1/feed')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for private 10.x IP', async () => {
    await expect(assertPublicUrl('http://10.0.0.1/feed')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for private 192.168.x IP', async () => {
    await expect(assertPublicUrl('http://192.168.1.1/feed')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for AWS metadata link-local IP', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when DNS resolution fails', async () => {
    mockResolve4.mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(assertPublicUrl('https://nonexistent.invalid/feed')).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException when DNS resolves to private IP', async () => {
    mockResolve4.mockResolvedValueOnce(['10.0.0.5']);
    await expect(assertPublicUrl('https://internal.corp/feed')).rejects.toThrow(ForbiddenException);
  });

  it('allows public raw IP address', async () => {
    const result = await assertPublicUrl('http://93.184.216.34/feed');
    expect(result.hostname).toBe('93.184.216.34');
  });

  it('returns parsed URL with correct protocol', async () => {
    mockResolve4.mockResolvedValueOnce(['1.2.3.4']);
    const result = await assertPublicUrl('https://example.com/rss');
    expect(result.protocol).toBe('https:');
  });
});
