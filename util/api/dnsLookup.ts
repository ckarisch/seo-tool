import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS functions
const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);
const dnsResolveMx = promisify(dns.resolveMx);
const dnsResolveTxt = promisify(dns.resolveTxt);
const dnsResolveNs = promisify(dns.resolveNs);
const dnsResolveCname = promisify(dns.resolveCname);

export interface ComprehensiveDnsResult {
  a: string[];
  aaaa: string[];
  mx: dns.MxRecord[];
  txt: string[][];
  ns: string[];
  cname: string[];
}

export interface TxtOnlyDnsResult {
  txt: string[][];
}

export type DnsResult = ComprehensiveDnsResult | TxtOnlyDnsResult;

export interface DnsLookupOptions {
  txtOnly?: boolean;
}

export class DnsLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsLookupError';
  }
}

/**
 * Performs a DNS lookup for the given domain.
 * @param domain The domain to look up.
 * @param options Options for the DNS lookup.
 * @returns A promise that resolves to the DNS lookup result.
 * @throws {DnsLookupError} If the DNS lookup fails.
 */
export async function performDnsLookup(domain: string, options: DnsLookupOptions = {}): Promise<DnsResult> {
  try {
    if (options.txtOnly) {
      const txt = await dnsResolveTxt(domain);
      return { txt };
    } else {
      const [a, aaaa, mx, txt, ns, cname] = await Promise.all([
        dnsResolve4(domain).catch(() => []),
        dnsResolve6(domain).catch(() => []),
        dnsResolveMx(domain).catch(() => []),
        dnsResolveTxt(domain).catch(() => []),
        dnsResolveNs(domain).catch(() => []),
        dnsResolveCname(domain).catch(() => []),
      ]);
      return { a, aaaa, mx, txt, ns, cname };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new DnsLookupError(`DNS lookup failed for ${domain}: ${error.message}`);
    } else {
      throw new DnsLookupError(`DNS lookup failed for ${domain}: Unknown error`);
    }
  }
}

// Example usage (can be commented out or removed when using as a module)
// async function main() {
//   try {
//     const domain = 'example.com';
    
//     // Comprehensive lookup
//     console.log('Comprehensive DNS lookup:');
//     const comprehensiveResult = await performDnsLookup(domain);
//     console.log(JSON.stringify(comprehensiveResult, null, 2));

//     // TXT-only lookup
//     console.log('\nTXT-only DNS lookup:');
//     const txtOnlyResult = await performDnsLookup(domain, { txtOnly: true });
//     console.log(JSON.stringify(txtOnlyResult, null, 2));
//   } catch (error) {
//     if (error instanceof DnsLookupError) {
//       console.error('DNS Lookup Error:', error.message);
//     } else {
//       console.error('Unexpected error:', error);
//     }
//   }
// }

// main();