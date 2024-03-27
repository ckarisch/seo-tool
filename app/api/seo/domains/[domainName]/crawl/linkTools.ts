export function analyzeLink(link: string, currentDomain:string) {
    // Normalize current domain for consistency
    currentDomain = currentDomain.replace(/^https?:\/\//, '').replace('www.', '');

    // Step 1: Strip away "https://" or "http://"
    let normalizedLink = link.replace(/^https?:\/\//, '');
    if(link.startsWith('/')) {
        normalizedLink = currentDomain + link;
    }

    // Step 2: Recognize if it starts with the subdomain "www" and save it
    let subdomain = normalizedLink.startsWith('www.') ? 'www' : '';

    // Determine if the link has an anchor
    let isAnchor = link.includes('#');
    let isMailto = link.includes('mailto:');
    let isTel = link.includes('tel:');

    // Prepare for domain extraction and checking if the link is external
    let isExternal = false;
    let linkWithoutProtocolAndSubdomain = normalizedLink.replace(/^www\./, '');
    let linkDomain = '';

    if (!isAnchor || !link.startsWith('#')) { // Process for non-simple anchors or potential external links
        // Extract the domain from the link without the protocol and potential "www."
        linkDomain = linkWithoutProtocolAndSubdomain.split('/')[0].split('#')[0]; // Removes path or anchor

        // Step 4: Check if the link is external by comparing the domain part
        isExternal = !!currentDomain && !linkDomain.endsWith(currentDomain);
    }

    let isInternalPage = !isExternal && !isMailto && !isAnchor && !isTel;

    const warningDoubleSlash = link.includes('//');

    // Logging results for demonstration
    // console.log(`Link: ${link}`);
    // console.log(`Normalized Link: ${normalizedLink}`);
    // console.log(`Subdomain: ${subdomain}`);
    // console.log(`Link Domain: ${linkDomain}`);
    // console.log(`Is Anchor: ${isAnchor}`);
    // console.log(`Is External: ${isExternal}`);
    return {isExternal, subdomain, normalizedLink, isAnchor, isMailto, isTel, isInternalPage, warningDoubleSlash}
}