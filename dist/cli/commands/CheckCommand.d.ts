import type { EnvironmentChecker } from "../EnvironmentChecker.js";
import type { OutputFormatter } from "../OutputFormatter.js";
import type { CommandOptionConfig, ValidationResult } from "../CliApplication.js";
/**
 * @fileoverview Check command handler for environment validation.
 * Implements the Command pattern by encapsulating the environment check operation
 * and providing detailed validation of system configuration.
 *
 * The check command validates:
 * - Environment variable configuration
 * - Required vs. optional settings
 * - Authentication credentials availability
 * - Playwright configuration status
 * - API access configuration
 */
/**
 * Environment check result interface
 */
export interface EnvironmentCheckResult {
    success: boolean;
    result?: {
        checks: Array<any>;
        isValid: boolean;
        requiredMissing: Array<string>;
        summary: any;
    };
    error?: string;
    stack?: string | undefined;
}
/**
 * Check the command handler for environment validation.
 * Follows a Command pattern by encapsulating the environment check operation.
 * Provides comprehensive validation of environment configuration and setup.
 */
export declare class CheckCommand {
    private readonly environmentChecker;
    private readonly outputFormatter;
    /**
     * Create a new check command instance.
     */
    constructor(environmentChecker: EnvironmentChecker, outputFormatter: OutputFormatter);
    /**
     * Execute the environment check command.
     * Performs comprehensive validation of environment configuration and displays results.
     */
    execute(options?: Record<string, any>): Promise<EnvironmentCheckResult>;
    /**
     * Handle command execution result and manage process exit codes.
     * Exits with code 1 if environment validation fails, ensuring CI/CD integration.
     */
    handleResult(result: EnvironmentCheckResult, options: Record<string, any>): void;
    /**
     * Get a human-readable command description for help text.
     */
    getDescription(): string;
    /**
     * Get command options configuration.
     * The check command doesn't require any specific options.
     */
    getOptionsConfig(): CommandOptionConfig[];
    /**
     * Validate command prerequisites before execution.
     * Check command has no prerequisites - it's designed to validate the environment.
     */
    validatePrerequisites(options: Record<string, any>): Promise<ValidationResult>;
    /**
     * Get the command name used for CLI registration.
     */
    getName(): string;
    /**
     * Check if this command handles the given command name.
     * Used by the CLI framework for command routing.
     */
    handles(commandName: string): boolean;
}
//# sourceMappingURL=CheckCommand.d.ts.map