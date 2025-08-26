/**
 * @fileoverview CLI option parser and validator. Converts raw Commander options
 * into normalized, validated option objects consumed by the application.
 */
/**
 * Main CLI options interface
 */
export interface MainCliOptions {
    headless: boolean;
    debug: boolean;
    timeout: string | number;
    retries: string | number;
    size: string;
    limit: string | number;
    dryRun?: boolean;
    manifestPath?: string;
    downloadDir?: string;
}
/**
 * Normalized downloader options interface
 */
export interface NormalizedDownloaderOptions {
    headless: boolean;
    debug: boolean;
    timeout: number;
    retries: number;
    preferredSize: "original" | "large" | "medium" | "small";
    limit?: number;
    dryRun: boolean;
    manifestPath?: string;
    downloadDir?: string;
}
/**
 * CLI option parser and validator following Single Responsibility Principle.
 * Handles parsing, validation, and normalization of command line options.
 * Converts raw CLI input into typed, validated configuration objects.
 *
 * @example
 * ```javascript
 * const optionParser = new OptionParser();
 *
 * // Parse main command options
 * const options = optionParser.parseMainOptions({
 *   headless: true,
 *   timeout: '45000',
 *   size: 'large'
 * });
 *
 * // Get default options from environment
 * const defaults = optionParser.getDefaultOptions();
 * ```
 */
export declare class OptionParser {
    private readonly validSizes;
    /**
     * Create a new option parser instance.
     * Sets up validation rules and valid option values.
     */
    constructor();
    /**
     * Parse and validate main command options from raw CLI input.
     * Orchestrates the complete option processing pipeline: parsing, validation, and normalization.
     */
    parseMainOptions(options: Record<string, any>): NormalizedDownloaderOptions;
    /**
     * Parse string numeric options into proper number types.
     * Handles CLI input which comes as strings and converts to numbers.
     */
    private parseNumericOptions;
    /**
     * Validate all main command options using individual validators.
     * Calls specific validation methods for each option type.
     */
    private validateMainOptions;
    /**
     * Validate timeout value to ensure it meets minimum requirements.
     * Timeout must be at least 1000ms to allow reasonable operation time.
     */
    private validateTimeout;
    /**
     * Validate retries value to ensure it's a positive number.
     * At least 1 retry is required for robust operation.
     */
    private validateRetries;
    /**
     * Validate limit value to ensure it's non-negative.
     * 0 means no limit, positive numbers set download limits.
     */
    private validateLimit;
    /**
     * Validate size option against allowed values.
     * Performs case-insensitive validation against valid size options.
     */
    private validateSize;
    /**
     * Build normalized downloader options from parsed and validated CLI options.
     * Transforms CLI input into the format expected by the downloader service.
     */
    private buildDownloaderOptions;
    /**
     * Parse list command options and resolve manifest path.
     * Handles manifest path resolution with defaults.
     */
    parseListOptions(options: Record<string, any>): {
        manifestPath: string;
    };
    /**
     * Get default CLI options from environment variables.
     * Provides fallback values when CLI options are not specified.
     */
    getDefaultOptions(): Record<string, any>;
}
//# sourceMappingURL=OptionParser.d.ts.map