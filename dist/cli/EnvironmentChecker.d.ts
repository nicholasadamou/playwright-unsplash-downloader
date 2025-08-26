/**
 * @fileoverview Service for validating and reporting on environment variables
 * required/used by the Playwright Image Downloader. Includes helpers for
 * categorization, result summaries, and typed accessors.
 */
import type { EnvironmentCheck, EnvironmentCheckResult } from "../types";
/**
 * Environment variable check category
 */
export type EnvironmentCategory = "authentication" | "api" | "playwright";
/**
 * Validation result for specific variable
 */
export interface VariableValidationResult {
    valid: boolean;
    error?: string;
    result?: any;
}
/**
 * Environment checker service for validating environment variables.
 * Follows the Single Responsibility Principle by handling only environment validation.
 */
export declare class EnvironmentChecker {
    private readonly environmentChecks;
    constructor();
    /**
     * Define all environment variable checks
     */
    private defineEnvironmentChecks;
    /**
     * Check all environment variables
     */
    checkEnvironment(): EnvironmentCheckResult;
    /**
     * Get the status for a check
     */
    private getCheckStatus;
    /**
     * Get the display value for a check
     */
    private getDisplayValue;
    /**
     * Validate if the environment is properly configured
     */
    private validateEnvironment;
    /**
     * Get a list of required missing environment variables
     */
    private getRequiredMissing;
    /**
     * Generate a summary of environment check
     */
    private generateSummary;
    /**
     * Check if a specific environment variable is set
     */
    isEnvironmentVariableSet(name: string): boolean;
    /**
     * Get environment variable value safely
     */
    getEnvironmentVariable(name: string, defaultValue?: any): string | null;
    /**
     * Validate specific environment variable
     */
    validateEnvironmentVariable(name: string, validator: (value: string) => any): VariableValidationResult;
    /**
     * Get checks by category
     */
    getChecksByCategory(category: EnvironmentCategory): EnvironmentCheck[];
    /**
     * Get all available categories
     */
    getCategories(): EnvironmentCategory[];
    /**
     * Get authentication status
     */
    getAuthenticationStatus(): {
        hasCredentials: boolean;
        email: string | null;
        hasPassword: boolean;
    };
    /**
     * Get playwright configuration status
     */
    getPlaywrightStatus(): {
        total: number;
        configured: number;
        variables: Array<{
            name: string;
            set: boolean;
            value: string | null;
        }>;
    };
    /**
     * Get API configuration status
     */
    getApiStatus(): {
        configured: boolean;
        missing: string[];
    };
}
//# sourceMappingURL=EnvironmentChecker.d.ts.map