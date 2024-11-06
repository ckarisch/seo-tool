import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ErrorType {
  code: string;
  name: string;
  implementation: ImplementationStatus;
  category: string;
}

type ImplementationStatus = 'NOT_IMPLEMENTED' | 'DEVELOPMENT' | 'PRODUCTION';

type GroupedErrorTypes = {
  [K in ImplementationStatus]?: ErrorType[];
};

async function getImplementationStatus() {
  const errorTypes = await prisma.errorType.findMany({
    select: {
      code: true,
      name: true,
      implementation: true,
      category: true
    },
    orderBy: {
      category: 'asc'
    }
  });

  const grouped = errorTypes.reduce((acc: GroupedErrorTypes, type) => {
    const status = type.implementation as ImplementationStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status]?.push(type);
    return acc;
  }, {} as GroupedErrorTypes);

  console.log('\nImplementation Status Summary:');
  console.log('-----------------------------');
  
  Object.entries(grouped).forEach(([status, types]: [string, ErrorType[] | undefined]) => {
    if (types) {
      console.log(`\n${status}: ${types.length} error types`);
      types.forEach(type => {
        console.log(`  - [${type.category}] ${type.code}: ${type.name}`);
      });
    }
  });
}

async function updateImplementation(code: string, status: ImplementationStatus) {
  await prisma.errorType.update({
    where: { code },
    data: { implementation: status }
  });
  console.log(`Updated ${code} to ${status}`);
}

async function main() {
  const command = process.argv[2];

  if (command === 'check') {
    await getImplementationStatus();
  } else if (command === 'update') {
    const code = process.argv[4];
    const status = process.argv[5] as ImplementationStatus;
    
    if (!code || !status) {
      console.error('Usage: npm run update:implementation update ERROR_CODE STATUS');
      console.error('Example: npm run update:implementation update ERROR_404 PRODUCTION');
      process.exit(1);
    }

    if (!['NOT_IMPLEMENTED', 'DEVELOPMENT', 'PRODUCTION'].includes(status)) {
      console.error('Status must be one of: NOT_IMPLEMENTED, DEVELOPMENT, PRODUCTION');
      process.exit(1);
    }

    await updateImplementation(code, status);
  } else {
    console.error('Invalid command. Use "check" or "update"');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {
  getImplementationStatus,
  updateImplementation
};

// examples
// npm run check:implementation
// npm run update:implementation update ERROR_404 PRODUCTION
// npm run update:implementation update MULTIPLE_H1 DEVELOPMENT