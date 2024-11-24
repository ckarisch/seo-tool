import { analyzeLink } from '@/apiComponents/crawler/linkTools';
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
 * Performs a DNS lookup for a domain using only the root domain
 * @param domain The domain to look up
 * @param options Options for the DNS lookup
 * @returns A promise that resolves to the DNS lookup result
 * @throws {DnsLookupError} If the DNS lookup fails
 */
export async function performDnsLookup(domain: string, options: DnsLookupOptions = {}): Promise<DnsResult> {
  // Use linkTools to analyze and get the root domain
  const analyzedDomain = analyzeLink(domain, domain);
  const rootDomain = analyzedDomain.linkDomain.replace(/^www\./, '');
  
  if (!rootDomain) {
    throw new DnsLookupError('Invalid domain format');
  }

  try {
    if (options.txtOnly) {
      const txt = await dnsResolveTxt(rootDomain);
      return { txt };
    } else {
      const [a, aaaa, mx, txt, ns, cname] = await Promise.all([
        dnsResolve4(rootDomain).catch(() => []),
        dnsResolve6(rootDomain).catch(() => []),
        dnsResolveMx(rootDomain).catch(() => []),
        dnsResolveTxt(rootDomain).catch(() => []),
        dnsResolveNs(rootDomain).catch(() => []),
        dnsResolveCname(rootDomain).catch(() => []),
      ]);

      return { a, aaaa, mx, txt, ns, cname };
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new DnsLookupError(`DNS lookup failed for ${rootDomain}: ${error.message}`);
    } else {
      throw new DnsLookupError(`DNS lookup failed for ${rootDomain}: Unknown error`);
    }
  }
}

// Example usage (commented out)
/*
async function main() {
  try {
    const domains = [
      'example.com',
      'www.example.com',
      'https://www.example.com/',
      'http://example.com'
    ];
    
    for (const domain of domains) {
      console.log(`\nLooking up DNS for: ${domain}`);
      const result = await performDnsLookup(domain);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    if (error instanceof DnsLookupError) {
      console.error('DNS Lookup Error:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
*/