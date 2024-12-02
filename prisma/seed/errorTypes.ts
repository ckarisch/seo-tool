import { PrismaClient, Severity, ImplementationStatus } from '@prisma/client'

const prisma = new PrismaClient();

export const ErrorCategory = {
    SEO: 'SEO',
    ACCESSIBILITY: 'ACCESSIBILITY',
    PERFORMANCE: 'PERFORMANCE',
    SECURITY: 'SECURITY',
    CONTENT: 'CONTENT',
    TECHNICAL: 'TECHNICAL',
    HTTP: 'HTTP',
    CMS: 'CMS',
    PRIVACY: 'PRIVACY',
    HEADERS: 'HEADERS',
    STRUCTURE: 'STRUCTURE',
    MOBILE: 'MOBILE',
    SCHEMA: 'SCHEMA',
} as const

interface ErrorTypeDefinition {
    code: string;
    name: string;
    category: keyof typeof ErrorCategory;
    severity: Severity;
}

export const errorTypes: ErrorTypeDefinition[] = [
    // HTTP Errors
    {
        code: 'ERROR_404',
        name: 'Page Not Found (404)',
        category: 'HTTP',
        severity: 'HIGH',
    },
    {
        code: 'ERROR_503',
        name: 'Service Unavailable (503)',
        category: 'HTTP',
        severity: 'CRITICAL',
    },
    {
        code: 'ERROR_500',
        name: 'Internal Server Error (500)',
        category: 'HTTP',
        severity: 'CRITICAL',
    },
    {
        code: 'ERROR_403',
        name: 'Forbidden Access (403)',
        category: 'HTTP',
        severity: 'HIGH',
    },
    {
        code: 'ERROR_301',
        name: 'Permanent Redirect Chain',
        category: 'HTTP',
        severity: 'MEDIUM',
    },
    {
        code: 'ERROR_UNKNOWN',
        name: 'Unknown HTTP Error',
        category: 'HTTP',
        severity: 'HIGH'
    },
    // SEO Structure Errors
    {
        code: 'MULTIPLE_H1',
        name: 'Multiple H1 Tags Found',
        category: 'SEO',
        severity: 'MEDIUM',
    },
    {
        code: 'MISSING_H1',
        name: 'No H1 Tag Found',
        category: 'SEO',
        severity: 'HIGH',
    },
    {
        code: 'MISSING_META_DESCRIPTION',
        name: 'Missing Meta Description',
        category: 'SEO',
        severity: 'MEDIUM',
    },
    {
        code: 'MISSING_TITLE',
        name: 'Missing Title Tag',
        category: 'SEO',
        severity: 'HIGH',
    },
    {
        code: 'TITLE_TOO_LONG',
        name: 'Title Tag Too Long',
        category: 'SEO',
        severity: 'MEDIUM',
    },
    {
        code: 'TITLE_TOO_SHORT',
        name: 'Title Tag Too Short',
        category: 'SEO',
        severity: 'MEDIUM',
    },
    {
        code: 'DUPLICATE_TITLE',
        name: 'Duplicate Title Tags',
        category: 'SEO',
        severity: 'HIGH',
    },
    {
        code: 'DUPLICATE_META_DESCRIPTION',
        name: 'Duplicate Meta Descriptions',
        category: 'SEO',
        severity: 'MEDIUM',
    },

    // Heading Structure Errors
    {
        code: 'INCORRECT_HEADING_ORDER',
        name: 'Incorrect Heading Hierarchy',
        category: 'STRUCTURE',
        severity: 'MEDIUM',
    },
    {
        code: 'SKIPPED_HEADING_LEVEL',
        name: 'Skipped Heading Level',
        category: 'STRUCTURE',
        severity: 'MEDIUM',
    },
    {
        code: 'EMPTY_HEADING',
        name: 'Empty Heading Tag',
        category: 'STRUCTURE',
        severity: 'LOW',
    },

    // CMS Errors
    {
        code: 'WP_ADMIN_BANNER',
        name: 'WordPress Admin Banner Present',
        category: 'CMS',
        severity: 'MEDIUM',
    },
    {
        code: 'WP_DEBUG_MODE',
        name: 'WordPress Debug Mode Enabled',
        category: 'CMS',
        severity: 'HIGH',
    },
    {
        code: 'WP_VERSION_EXPOSED',
        name: 'WordPress Version Exposed',
        category: 'CMS',
        severity: 'MEDIUM',
    },
    {
        code: 'WP_LOGIN_EXPOSED',
        name: 'WordPress Login Page Accessible',
        category: 'CMS',
        severity: 'MEDIUM',
    },
    {
        code: 'WP_README_EXPOSED',
        name: 'WordPress Readme File Accessible',
        category: 'CMS',
        severity: 'LOW',
    },

    // Security Errors
    {
        code: 'EMAIL_EXPOSED',
        name: 'Email Address Exposed in Plain Text',
        category: 'SECURITY',
        severity: 'LOW',
    },
    {
        code: 'MISSING_HTTPS',
        name: 'HTTPS Not Enabled',
        category: 'SECURITY',
        severity: 'CRITICAL',
    },
    {
        code: 'MIXED_CONTENT',
        name: 'Mixed Content Issues',
        category: 'SECURITY',
        severity: 'HIGH',
    },
    {
        code: 'SENSITIVE_FILES_EXPOSED',
        name: 'Sensitive Files Accessible',
        category: 'SECURITY',
        severity: 'CRITICAL',
    },
    {
        code: 'INSECURE_FORMS',
        name: 'Forms Submitting Over HTTP',
        category: 'SECURITY',
        severity: 'CRITICAL',
    },

    // Privacy Errors
    {
        code: 'PREMATURE_ANALYTICS',
        name: 'Analytics Loaded Before Consent',
        category: 'PRIVACY',
        severity: 'HIGH',
    },
    {
        code: 'PREMATURE_TAGMANAGER',
        name: 'Tag Manager Loaded Before Consent',
        category: 'PRIVACY',
        severity: 'HIGH',
    },
    {
        code: 'MISSING_PRIVACY_POLICY',
        name: 'Missing Privacy Policy Link',
        category: 'PRIVACY',
        severity: 'HIGH',
    },
    {
        code: 'MISSING_COOKIE_NOTICE',
        name: 'Missing Cookie Consent Notice',
        category: 'PRIVACY',
        severity: 'HIGH',
    },
    {
        code: 'THIRD_PARTY_COOKIES',
        name: 'Third-Party Cookies Without Consent',
        category: 'PRIVACY',
        severity: 'HIGH',
    },

    // Header Errors
    {
        code: 'MISSING_CACHE_CONTROL',
        name: 'Missing Cache-Control Header',
        category: 'HEADERS',
        severity: 'MEDIUM',
    },
    {
        code: 'MISSING_SECURITY_HEADERS',
        name: 'Missing Security Headers',
        category: 'HEADERS',
        severity: 'HIGH',
    },
    {
        code: 'INCORRECT_CONTENT_TYPE',
        name: 'Incorrect Content-Type Header',
        category: 'HEADERS',
        severity: 'MEDIUM',
    },
    {
        code: 'MISSING_CORS_HEADERS',
        name: 'Missing CORS Headers',
        category: 'HEADERS',
        severity: 'MEDIUM',
    },

    // Accessibility Errors
    {
        code: 'MISSING_ALT_TEXT',
        name: 'Images Missing Alt Text',
        category: 'ACCESSIBILITY',
        severity: 'HIGH',
    },
    {
        code: 'LOW_CONTRAST',
        name: 'Low Color Contrast',
        category: 'ACCESSIBILITY',
        severity: 'HIGH',
    },
    {
        code: 'MISSING_ARIA_LABELS',
        name: 'Missing ARIA Labels',
        category: 'ACCESSIBILITY',
        severity: 'MEDIUM',
    },
    {
        code: 'KEYBOARD_TRAP',
        name: 'Keyboard Navigation Trap',
        category: 'ACCESSIBILITY',
        severity: 'HIGH',
    },

    // Performance Errors
    {
        code: 'LARGE_IMAGES',
        name: 'Unoptimized Large Images',
        category: 'PERFORMANCE',
        severity: 'MEDIUM',
    },
    {
        code: 'SLOW_LOAD_TIME',
        name: 'Slow Page Load Time',
        category: 'PERFORMANCE',
        severity: 'HIGH',
    },
    {
        code: 'RENDER_BLOCKING_RESOURCES',
        name: 'Render-Blocking Resources',
        category: 'PERFORMANCE',
        severity: 'MEDIUM',
    },
    {
        code: 'EXCESSIVE_DOM_SIZE',
        name: 'Excessive DOM Size',
        category: 'PERFORMANCE',
        severity: 'MEDIUM',
    },
    {
        code: 'UNMINIFIED_RESOURCES',
        name: 'Unminified CSS/JS Resources',
        category: 'PERFORMANCE',
        severity: 'LOW',
    },

    // Mobile Errors
    {
        code: 'NOT_MOBILE_FRIENDLY',
        name: 'Page Not Mobile-Friendly',
        category: 'MOBILE',
        severity: 'HIGH',
    },
    {
        code: 'VIEWPORT_NOT_SET',
        name: 'Viewport Meta Tag Not Set',
        category: 'MOBILE',
        severity: 'HIGH',
    },
    {
        code: 'SMALL_TAP_TARGETS',
        name: 'Tap Targets Too Small',
        category: 'MOBILE',
        severity: 'MEDIUM',
    },

    // Schema Errors
    {
        code: 'INVALID_SCHEMA',
        name: 'Invalid Schema Markup',
        category: 'SCHEMA',
        severity: 'MEDIUM',
    },
    {
        code: 'MISSING_REQUIRED_SCHEMA_PROPERTIES',
        name: 'Missing Required Schema Properties',
        category: 'SCHEMA',
        severity: 'MEDIUM',
    },
    {
        code: 'DUPLICATE_SCHEMA',
        name: 'Duplicate Schema Markup',
        category: 'SCHEMA',
        severity: 'MEDIUM',
    },

    // Content Errors
    {
        code: 'BROKEN_LINKS',
        name: 'Broken Internal Links',
        category: 'CONTENT',
        severity: 'HIGH',
    },
    {
        code: 'BROKEN_IMAGES',
        name: 'Broken Images',
        category: 'CONTENT',
        severity: 'HIGH',
    },
    {
        code: 'DUPLICATE_CONTENT',
        name: 'Duplicate Content Detected',
        category: 'CONTENT',
        severity: 'MEDIUM',
    },
    {
        code: 'THIN_CONTENT',
        name: 'Thin Content (Under 300 Words)',
        category: 'CONTENT',
        severity: 'MEDIUM',
    },
    {
        code: 'SPELLING_ERRORS',
        name: 'Multiple Spelling Errors',
        category: 'CONTENT',
        severity: 'LOW',
    },

    // Technical Errors
    {
        code: 'ROBOTS_BLOCKED',
        name: 'Page Blocked by Robots.txt',
        category: 'TECHNICAL',
        severity: 'HIGH',
    },
    {
        code: 'INVALID_HREFLANG',
        name: 'Invalid Hreflang Implementation',
        category: 'TECHNICAL',
        severity: 'MEDIUM',
    },
    {
        code: 'INVALID_SITEMAP',
        name: 'Invalid XML Sitemap',
        category: 'TECHNICAL',
        severity: 'HIGH',
    },
    {
        code: 'INVALID_CANONICAL',
        name: 'Invalid Canonical URL',
        category: 'TECHNICAL',
        severity: 'HIGH',
    },
    {
        code: 'INVALID_AMP',
        name: 'Invalid AMP Implementation',
        category: 'TECHNICAL',
        severity: 'MEDIUM',
    }
];

export async function seedErrorTypes(prisma: PrismaClient) {
    console.log('Seeding error types...');

    for (const errorType of errorTypes) {
        // First check if the error type exists
        const existingErrorType = await prisma.errorType.findUnique({
            where: { code: errorType.code },
        });

        if (existingErrorType) {
            // Update everything except implementation status
            await prisma.errorType.update({
                where: { code: errorType.code },
                data: {
                    name: errorType.name,
                    category: errorType.category,
                    severity: errorType.severity,
                    // implementation is deliberately omitted to preserve existing value
                },
            });
        } else {
            // Create new error type with default implementation status
            await prisma.errorType.create({
                data: {
                    ...errorType,
                    implementation: 'NOT_IMPLEMENTED',
                },
            });
        }
    }

    console.log('Error types seeded successfully');
}

// Utility function to update implementation status
export async function updateErrorTypeImplementation(
    prisma: PrismaClient,
    code: string,
    implementation: ImplementationStatus
) {
    return prisma.errorType.update({
        where: { code },
        data: { implementation },
    });
}

async function main() {
    await seedErrorTypes(prisma);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });