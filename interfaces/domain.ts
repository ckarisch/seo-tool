import { Domain } from "@prisma/client";

export interface Domain_old {
  id: string;
  name: string;
  domainName: string;
  domainVerificationKey: string;
  domainVerified: boolean;
  warning: boolean;
  error: boolean;
  // error states
  error404: boolean;
  error404NotificationDisabled: boolean;
  error404NotificationDisabledUntil: Date;
  error503: boolean;
  error503NotificationDisabled: boolean;
  error503NotificationDisabledUntil: Date;
  crawlEnabled: boolean;
  crawlStatus: string;
  crawlInterval: number;
  crawlDepth: number;
  lastCrawlTime: number;
  lastErrorType: string;
  lastErrorTime: Date;
  lastErrorMessage: string;
  score: number;
  disableNotifications: boolean;
  image: string;
  performanceScore: number | null;
  robotsIndex: boolean | null;
  robotsFollow: boolean | null;
  timeoutPercentage: number | null;
  badRequestPercentage: number | null;
  typeErrorPercentage: number | null;
}

export const defaultDomainState: Partial<Domain> = {
  id: "-1",
  name: "name", // Default value for name
  domainName: "domain", // Default value for domainName
  domainVerificationKey: "",
  domainVerified: false,
  error: false,
  error404: false,
  error503: false,
  warning: false,
  crawlEnabled: false,
  crawlStatus: "idle",
  lastCrawlTime: 0,
  disableNotifications: false,
  image: undefined,
  performanceScore: null,
  robotsFollow: null,
  robotsIndex: null,
  timeoutPercentage: null,
  badRequestPercentage: null,
  typeErrorPercentage: null,
};
