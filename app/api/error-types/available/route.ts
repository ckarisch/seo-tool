// app/api/error-types/available/route.ts
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { UserRole, ImplementationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic'

const isDevelopment = process.env.NODE_ENV?.toLowerCase() === 'development'
    || process.env.NODE_ENV?.toLowerCase() === 'local';

const isTest = isDevelopment && (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
);
/**
 * Determines which error types a user can see based on their role
 */
function getAccessibleRoles(userRole: UserRole): UserRole[] {
    switch (userRole) {
        case 'ADMIN':
            return ['ADMIN', 'PREMIUM', 'STANDARD'];
        case 'PREMIUM':
            return ['PREMIUM', 'STANDARD'];
        case 'STANDARD':
        default:
            return ['STANDARD'];
    }
}

/**
 * Gets the allowed implementation statuses based on environment
 */
function getAllowedImplementationStatuses(): ImplementationStatus[] {
    console.log('isTest: ' + (isTest ? 'test': 'notest') )
    console.log('isDevelopment: ' + (isDevelopment ? 'isDevelopment': 'noisDevelopment') )
    if (isTest) {
        return ['PRODUCTION', 'DEVELOPMENT', 'TEST'];
    }
    if (isDevelopment) {
        return ['PRODUCTION', 'DEVELOPMENT'];
    }
    return ['PRODUCTION'];
}

/**
 * Fetches error types available to the current user
 */
export async function GET(req: NextRequest) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return Response.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get user with role
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { role: true }
        });

        if (!user) {
            return Response.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get accessible roles based on user's role
        const accessibleRoles = getAccessibleRoles(user.role);

        // Get allowed implementation statuses
        const allowedImplementationStatuses = getAllowedImplementationStatuses();

        // Fetch error types
        const errorTypes = await prisma.errorType.findMany({
            where: {
                AND: [
                    { implementation: { in: allowedImplementationStatuses } }, // Show both PRODUCTION and DEVELOPMENT in dev mode
                    { userRole: { in: accessibleRoles } } // Filter by accessible roles
                ]
            },
            orderBy: [
                { implementation: 'desc' }, // PRODUCTION first, then DEVELOPMENT
                { category: 'asc' },
                { severity: 'desc' },
                { name: 'asc' }
            ],
            select: {
                id: true,
                code: true,
                name: true,
                implementation: true,
                category: true,
                severity: true,
                userRole: true
            }
        });

        // For STANDARD users, also include PREMIUM features (but marked as locked)
        if (user.role === 'STANDARD') {
            const premiumFeatures = await prisma.errorType.findMany({
                where: {
                    AND: [
                        { implementation: { in: allowedImplementationStatuses } },
                        { userRole: 'PREMIUM' }
                    ]
                },
                orderBy: [
                    { implementation: 'desc' },
                    { category: 'asc' },
                    { severity: 'desc' },
                    { name: 'asc' }
                ],
                select: {
                    id: true,
                    code: true,
                    name: true,
                    implementation: true,
                    category: true,
                    severity: true,
                    userRole: true
                }
            });

            errorTypes.push(...premiumFeatures);
        }

        // Sort combined results
        const sortedErrorTypes = errorTypes.sort((a, b) => {
            // First by implementation status (PRODUCTION before DEVELOPMENT)
            if (a.implementation !== b.implementation) {
                return a.implementation === 'PRODUCTION' ? -1 : 1;
            }

            // Then by role priority (STANDARD first, then PREMIUM)
            if (a.userRole !== b.userRole) {
                return a.userRole === 'STANDARD' ? -1 : 1;
            }

            // Then by category
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }

            // Then by severity
            const severityOrder = {
                CRITICAL: 0,
                HIGH: 1,
                MEDIUM: 2,
                LOW: 3,
                INFO: 4
            };
            if (a.severity !== b.severity) {
                return severityOrder[a.severity] - severityOrder[b.severity];
            }

            // Finally by name
            return a.name.localeCompare(b.name);
        });

        return Response.json(
            { errorTypes: sortedErrorTypes },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'private, max-age=60' // Cache for 1 minute for logged-in users
                }
            }
        );
    } catch (error) {
        console.error('Error fetching error types:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}