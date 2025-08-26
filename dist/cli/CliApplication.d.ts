import type { OutputFormatter } from "./OutputFormatter.js";
/**
 * Command option configuration
 */
export interface CommandOptionConfig {
    /** CLI flag definition (e.g., "-t, --timeout <number>") */
    flag: string;
    /** Human-readable description for the option */
    description: string;
    /** Optional default value passed to Commander */
    defaultValue?: any;
}
/**
 * Validation result interface
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
/**
 * Command handler interface
 */
export interface CommandHandler {
    /** Returns the command name */
    getName(): string;
    /** Returns the command description */
    getDescription(): string;
    /** Returns option configs */
    getOptionsConfig(): CommandOptionConfig[];
    /** Executes the command */
    execute(options: Record<string, any>): Promise<any>;
    /** Handles result */
    handleResult(result: any, options: Record<string, any>): void;
    /** Validates prerequisites */
    validatePrerequisites?(options: Record<string, any>): Promise<ValidationResult>;
}
/**
 * CLI application orchestrator that coordinates all CLI services and command handlers.
 * Manages command registration, option parsing, and execution workflow.
 *
 * @example
 * ```javascript
 * const outputFormatter = new OutputFormatter();
 * const cliApp = new CliApplication(outputFormatter);
 *
 * // Register commands
 * const mainCommand = new MainCommand(optionParser, outputFormatter);
 * cliApp.registerCommand(mainCommand);
 *
 * // Set up error handling and run
 * cliApp.setupErrorHandling();
 * await cliApp.run();
 * ```
 */
export declare class CliApplication {
    private readonly outputFormatter;
    private readonly commands;
    private readonly program;
    /**
     * Create a new CLI application instance.
     */
    constructor(outputFormatter: OutputFormatter);
    /**
     * Set up the main program configuration with name, description, and version.
     * This configures the root Commander.js program instance.
     */
    private setupProgram;
    /**
     * Register a command handler with the CLI application.
     * Determines whether to set up as main command or sub-command based on name.
     */
    registerCommand(commandHandler: CommandHandler): void;
    /**
     * Set up the main (default) command by adding options and action handler.
     * The main command is executed when no sub-command is specified.
     */
    private setupMainCommand;
    /**
     * Set up a sub-command by creating a new Commander command with options and action.
     * Sub-commands are accessed via `program-name command-name`.
     */
    private setupSubCommand;
    /**
     * Execute a command by name with comprehensive error handling and validation.
     * Handles prerequisite validation, command execution, and result processing.
     */
    executeCommand(commandName: string, options: Record<string, any>): Promise<any>;
    /**
     * Parse command line arguments and execute the appropriate command.
     * This is the main entry point for CLI execution.
     */
    run(args?: string[]): Promise<void>;
    /**
     * Set up global error handling for uncaught exceptions and unhandled rejections.
     * This ensures graceful error reporting and process termination.
     */
    setupErrorHandling(): void;
}
//# sourceMappingURL=CliApplication.d.ts.map