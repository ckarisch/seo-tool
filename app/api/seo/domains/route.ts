import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/authOptions";
import { VerificationCodeGenerator } from "@/util/api/domainVerificationKey";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, res: NextResponse) {
  const session = await getServerSession(
    req as unknown as NextApiRequest,
    {
      ...res,
      getHeader: (name: string) => res.headers?.get(name),
      setHeader: (name: string, value: string) => res.headers?.set(name, value),
    } as unknown as NextApiResponse,
    authOptions
  );

  console.log("session", session);

  if (!session || !session!.user) {
    console.log("no session");
    return Response.json(
      { error: "Not authenticated", domains: [] },
      { status: 401 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
  });
  if (!user) {
    console.log("no user");
    return Response.json(
      { error: "Not authenticated", domains: [] },
      { status: 401 }
    );
  }

  let domains = await prisma.domain.findMany({
    where: { userId: user.id },
    orderBy: {
      name: "asc",
    },
  });

  for (const d of domains) {
    // set domain verification key if it does not exist
    if (!d.domainVerificationKey) {
      const verificationKey = VerificationCodeGenerator.generate();
      await prisma.domain.update({
        where: { id: d.id },
        data: { domainVerificationKey: verificationKey },
      });
    }
  }

  // refresh domains
  domains = await prisma.domain.findMany({ where: { userId: user.id } });
  domains.sort((a, b) => {
    // First compare by verification status
    if (a.domainVerified !== b.domainVerified) {
      // Put verified domains first
      return b.domainVerified ? 1 : -1;
    }

    // If verification status is the same, sort by name
    return a.name.localeCompare(b.name);
  });

  return Response.json({ domains, loaded: true }, { status: 200 });
}

// post new domain
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log("error: no session");
    return Response.json(
      { error: "Not authenticated", domains: [] },
      { status: 401 }
    );
  }

  const data = (await request.json()) as { name: string; domainName: string };
  const { name, domainName } = data;

  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
  });
  const existingDomain = await prisma.domain.findUnique({
    where: { domainName },
  });

  if (existingDomain) {
    return Response.json({ error: "domain already exists" }, { status: 500 });
  }

  if (!user) {
    return Response.json({ error: "user not found" }, { status: 500 });
  }

  const domain = await prisma.domain.create({
    data: {
      name,
      domainName,
      userId: user.id,
      crawlInterval: 24 * 60, // once a day
    },
  });

  return Response.json({ domain }, { status: 200 });
}
