import { isDevelopment, isTest } from "@/crawler/errorChecker";


export function extractDomain(url: string): string {
    // Handle empty or invalid URLs
    if (!url) return '';

    // Remove protocol (http:// or https://)
    let domain = url.replace(/^https?:\/\//, '');

    // Remove anything after the first hash
    domain = domain.split('#')[0];

    // Remove anything after the first slash
    domain = domain.split('/')[0];

    // Remove trailing slash if it exists
    domain = domain.replace(/\/$/, '');

    return domain;
}

export function analyzeLink(link: string, currentDomain: string) {
    // Normalize current domain for consistency
    currentDomain = extractDomain(currentDomain);

    // Step 1: Strip away "https://" or "http://"
    // Determine if the link has an anchor
    let isAnchor = link.includes('#');
    let isMailto = link.includes('mailto:');
    let isTel = link.includes('tel:');
    let externalCheckDone = false;
    const isImage = link.endsWith('.jpeg') || link.endsWith('.jpg') || link.endsWith('.png') || link.endsWith('.webp');
    const isDocument = link.endsWith('.pdf') || link.endsWith('.docx');
    const isZip = link.endsWith('.zip');
    const isHtmlPage = link.endsWith('.html');
    const includesDots = link.includes('.');
    const dotCount = link.split('.').length - 1;
    const includeProtocol = link.includes(':');

    const isLocalTestHttpLink = (isDevelopment || isTest) && link.startsWith('localhost');
    let protocol = 'https';
    if (isLocalTestHttpLink) {
        protocol = 'http';
    }

    const isFile = isImage || isDocument || isZip;

    // Prepare for domain extraction and checking if the link is external
    let isExternal = false;
    // let linkWithoutProtocolAndSubdomain = normalizedLink.replace(/^www\./, '');
    let linkDomain = '';
    let linkDomainWithHttps = ''

    let isPageLink = !includeProtocol && (
        (isHtmlPage && dotCount === 1) ||
        (dotCount === 0)
    )
    if(isPageLink) {
        isExternal = false;
        externalCheckDone = true;
    }

    let normalizedLink = link.replace(/^https?:\/\//, '');
    if (link.startsWith('/')) {
        normalizedLink = currentDomain + link;
        isExternal = true;
        externalCheckDone = true;
    }
    else {
        if (isPageLink && !link.startsWith(currentDomain)) {
            normalizedLink = currentDomain + '/' + link;
        }
    }

    // Create normalized page link by removing everything after the last hash
    let normalizedPageLink = normalizedLink;
    const lastHashIndex = normalizedPageLink.lastIndexOf('#');
    if (lastHashIndex !== -1) {
        normalizedPageLink = normalizedPageLink.substring(0, lastHashIndex);
    }

    // Step 2: Recognize if it starts with the subdomain "www" and save it
    let subdomain = normalizedLink.startsWith('www.') ? 'www' : '';


    if (!externalCheckDone && (!isAnchor || !link.startsWith('#'))) { // Process for non-simple anchors or potential external links
        // Extract the domain from the link without the protocol and potential "www."
        linkDomain = extractDomain(normalizedLink); // Removes path or anchor
        linkDomainWithHttps = protocol + '://' + linkDomain;

        // Step 4: Check if the link is external by comparing the domain part
        
        isExternal = !isPageLink && !!currentDomain && !linkDomain.endsWith(currentDomain);
    }

    let isInternal = !isExternal && !isMailto && !isTel;
    let isInternalPage = isInternal && !isFile;
    let isExternalPage = !isInternalPage && !isFile;

    const warningDoubleSlash = normalizedLink.includes('//');

    let normalizedHttpsLink: string = normalizedLink;
    if (!isPageLink) {
        normalizedHttpsLink = protocol + '://' + normalizedLink;
    }

    // Create normalized HTTPS page link
    let normalizedHttpsPageLink = protocol + '://' + normalizedPageLink;


    // Logging results for demonstration
    // console.log(`Link: ${link}`);
    // console.log(`Normalized Link: ${normalizedLink}`);
    // console.log(`Subdomain: ${subdomain}`);
    // console.log(`Link Domain: ${linkDomain}`);
    // console.log(`Is Anchor: ${isAnchor}`);
    // console.log(`Is External: ${isExternal}`);
    // console.log(`Is Internal: ${isInternal}`);
    return { isExternal, subdomain, linkDomain, linkDomainWithHttps, normalizedLink, normalizedHttpsLink, normalizedPageLink, normalizedHttpsPageLink, isAnchor, isMailto, isTel, isInternal, isInternalPage, isExternalPage, warningDoubleSlash, isFile, isLocalTestHttpLink }
}