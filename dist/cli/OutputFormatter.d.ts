import type { ConfigOptions, EnvironmentCheckResult, ImageData } from "../types";
/**
 * @fileoverview Utilities for consistent console output and formatting across
 * the CLI. Methods here should not modify program state; they only write to
 * stdout/stderr.
 */
export declare class OutputFormatter {
    constructor();
    /**
     * Display CLI header with title
     * @param title Section or application title
     */
    displayHeader(title: string): void;
    /**
     * Display configuration summary
     * @param options Normalized options
     */
    displayConfiguration(options: Partial<ConfigOptions>): void;
    /**
     * Display dry run notice
     */
    displayDryRunNotice(): void;
    /**
     * Display environment check results
     */
    displayEnvironmentCheck(checkResult: EnvironmentCheckResult): void;
    /**
     * Display environment check summary
     */
    displayEnvironmentSummary(checkResult: EnvironmentCheckResult): void;
    /**
     * Display environment check notes
     */
    displayEnvironmentNotes(): void;
    /**
     * Display environment status
     */
    displayEnvironmentStatus(isValid: boolean): void;
    /**
     * Display image list header
     */
    displayImageListHeader(imageCount: number, manifestPath: string, generatedAt: string): void;
    /**
     * Display individual image entry
     */
    displayImageEntry(index: number, photoId: string, imageData: ImageData): void;
    /**
     * Display error message
     */
    displayError(message: string, details?: string | null): void;
    /**
     * Display success message
     */
    displaySuccess(message: string): void;
    /**
     * Display warning message
     */
    displayWarning(message: string): void;
    /**
     * Display info message
     */
    displayInfo(message: string): void;
    /**
     * Display shutdown message
     */
    displayShutdown(): void;
    /**
     * Display section header
     */
    displaySectionHeader(title: string, icon?: string | null): void;
    /**
     * Display bulleted list
     */
    displayList(items: string[], indent?: string): void;
    /**
     * Display key-value pairs
     */
    displayKeyValue(pairs: Array<{
        key: string;
        value: string;
        color?: "gray" | "red" | "green" | "blue" | "yellow";
    }>, indent?: string): void;
    /**
     * Display progress message
     */
    displayProgress(current: number, total: number, message: string): void;
    /**
     * Format file size for display
     */
    formatFileSize(bytes: number): string;
    /**
     * Format duration for display
     */
    formatDuration(seconds: number): string;
}
//# sourceMappingURL=OutputFormatter.d.ts.map