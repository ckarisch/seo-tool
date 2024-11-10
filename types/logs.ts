// types/logs.ts
export type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface QuickAnalysisMetrics {
    loadTime: number;
    resourceCount: number;
    errors: number;
    warnings: number;
    performanceScore: number | null;
    seoScore: number | null;
    accessibility: null;
    bestPractices: null;
}

export interface BaseLogEntry {
    type: string;
    text: string;
    timestamp: string;
}

export interface LogMessageEntry extends BaseLogEntry {
    type: 'log';
}

export interface IssueLogEntry extends BaseLogEntry {
    type: 'issue';
    issueType: string;
    issueSeverity: IssueSeverity;
    issueMessage: string;
}

export interface MetricLogEntry extends BaseLogEntry {
    type: 'metric';
    metricType: string;
    metrics?: any;
    performance?: any;
    metricValue?: number;
}

export type CustomLogEntry = IssueLogEntry | MetricLogEntry | LogMessageEntry;

export interface QuickAnalysisIssue {
    type: string;
    severity: string;
    message: string;
}

export interface PerformanceMetrics {
    loadTime: number;
    timeToInteractive?: number;
    firstContentfulPaint?: number;
    performanceScore?: number;
    totalResources?: number;
    totalBytes?: number;
}