import type { OptionParser } from "../OptionParser.js";
import type { OutputFormatter } from "../OutputFormatter.js";
import type { CommandOptionConfig, ValidationResult } from "../CliApplication.js";
/**
 * @fileoverview List command handler for displaying manifest contents.
 * Implements the Command pattern by encapsulating the list operation
 * and providing a formatted display of manifest image entries.
 *
 * The list command provides:
 * - Manifest content preview and validation
 * - Image entry listing with metadata
 * - Filtering and formatting options
 * - Statistics and summary information
 * - Multiple output formats (table, json, csv)
 */
/**
 * List command result interface
 */
export interface ListCommandResult {
    success: boolean;
    result?: {
        manifest: any;
        images: Array<[string, any]>;
        manifestPath: string;
        imageCount: number;
    };
    error?: string;
    stack?: string | undefined;
}
/**
 * List command handler for displaying manifest contents.
 * Follows Command pattern by encapsulating the list operation.
 * Provides comprehensive manifest content display with filtering options.
 */
export declare class ListCommand {
    private readonly optionParser;
    private readonly outputFormatter;
    /**
     * Create a new list command instance.
     */
    constructor(optionParser: OptionParser, outputFormatter: OutputFormatter);
    /**
     * Execute the list command to display manifest contents.
     * Loads and parses the manifest file, then displays formatted image entries.
     */
    execute(options?: Record<string, any>): Promise<ListCommandResult>;
    /**
     * Handle command execution result and manage error display.
     * Shows formatted error messages and exits with error code on failure.
     */
    handleResult(result: ListCommandResult, options: Record<string, any>): void;
    /**
     * Get a human-readable command description for help text.
     */
    getDescription(): string;
    /**
     * Get command-specific CLI options configuration.
     * Defines all available flags and options for the list command.
     */
    getOptionsConfig(): CommandOptionConfig[];
    /**
     * Validate command prerequisites before execution.
     * Checks that the specified manifest file exists and is accessible.
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
//# sourceMappingURL=ListCommand.d.ts.map