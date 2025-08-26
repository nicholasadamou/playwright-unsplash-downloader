import type { OptionParser } from "../OptionParser.js";
import type { OutputFormatter } from "../OutputFormatter.js";
import type { CommandOptionConfig, ValidationResult } from "../CliApplication.js";
/**
 * @fileoverview Main command handler for the download functionality.
 * Implements the Command pattern by encapsulating the main download operation
 * and coordinating with the option parser and output formatter.
 */
/**
 * Main command result interface
 */
export interface MainCommandResult {
    success: boolean;
    result?: any;
    error?: string;
    stack?: string | undefined;
}
/**
 * Main command handler for the download functionality.
 * Follows a Command pattern by encapsulating the main download operation.
 * Provides the primary interface for image downloading via CLI.
 */
export declare class MainCommand {
    private readonly optionParser;
    private readonly outputFormatter;
    /**
     * Create a new main command instance.
     */
    constructor(optionParser: OptionParser, outputFormatter: OutputFormatter);
    /**
     * Execute the main download command
     */
    execute(options: Record<string, any>): Promise<MainCommandResult>;
    /**
     * Handle command execution result
     */
    handleResult(result: MainCommandResult, options: Record<string, any>): void;
    /**
     * Get command description
     */
    getDescription(): string;
    /**
     * Get command options configuration
     */
    getOptionsConfig(): CommandOptionConfig[];
    /**
     * Validate command prerequisites
     */
    validatePrerequisites(options: Record<string, any>): Promise<ValidationResult>;
    /**
     * Get command name
     */
    getName(): string;
    /**
     * Check if this command handles the given command name
     */
    handles(commandName: string): boolean;
}
//# sourceMappingURL=MainCommand.d.ts.map