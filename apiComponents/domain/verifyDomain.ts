import { prisma } from "@/lib/prisma";
import { performDnsLookup } from "@/util/api/dnsLookup";
import { Domain } from "@prisma/client";

export const VerifyDomain = async (domain: Domain): Promise<any> => {
    console.log('lookup', domain.domainName);
    if (!domain.domainVerificationKey)
        return false;

    const dnsRecords = await performDnsLookup(domain.domainName, { txtOnly: true });
    console.log('dns records: ', JSON.stringify(dnsRecords, null, 2));

    let isVerified = false;

    for (const entry of dnsRecords.txt) {
        if (entry.includes(domain.domainVerificationKey)) {
            await prisma.domain.update({ where: { id: domain.id }, data: { domainVerified: true } })
            isVerified = true;
            console.log('domain verified!');
        }
    }

    return isVerified;
}