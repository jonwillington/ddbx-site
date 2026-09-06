/** Type surface for shared/tracking.js. */
export declare const TRACKING_SINCE_YEAR: number;
export declare const TRACKING_SINCE_LABEL: string;
export declare const TRACKING_SINCE_LABEL_BY_MARKET: Record<string, string>;
export declare const TRACKING_NOTICE: string;
export declare const TRACKING_SINCE_DATE: string;
export declare function trackingSinceLabel(marketId?: string | null): string;
export declare function trackingNotice(marketId?: string | null): string;
