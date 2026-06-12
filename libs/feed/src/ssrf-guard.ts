import { promises as dns } from 'dns';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

const PRIVATE_IPV4 = [
  /^127\./,                          // loopback
  /^10\./,                           // RFC 1918
  /^192\.168\./,                     // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,    // RFC 1918
  /^169\.254\./,                     // link-local (AWS metadata at 169.254.169.254)
  /^0\./,                            // this-network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

const PRIVATE_IPV6 = [/^::1$/, /^fc00:/i, /^fe80:/i, /^::ffff:/i];

function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) return PRIVATE_IPV6.some((r) => r.test(ip));
  return PRIVATE_IPV4.some((r) => r.test(ip));
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Only HTTP and HTTPS URLs are allowed');
  }

  const hostname = parsed.hostname;

  // Reject raw IP addresses (no DNS needed — check directly)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateIp(hostname)) {
      throw new ForbiddenException('Private or internal IP addresses are not allowed');
    }
    return parsed;
  }

  // Resolve DNS and validate all returned addresses
  let addresses: string[];
  try {
    addresses = await dns.resolve4(hostname);
  } catch {
    throw new BadRequestException(`Cannot resolve hostname: ${hostname}`);
  }

  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new ForbiddenException('Feed URL resolves to a private or internal address');
    }
  }

  return parsed;
}
