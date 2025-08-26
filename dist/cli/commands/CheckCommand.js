/**
 * Check the command handler for environment validation.
 * Follows a Command pattern by encapsulating the environment check operation.
 * Provides comprehensive validation of environment configuration and setup.
 */
export class CheckCommand {
    environmentChecker;
    outputFormatter;
    /**
     * Create a new check command instance.
     */
    constructor(environmentChecker, outputFormatter) {
        this.environmentChecker = environmentChecker;
        this.outputFormatter = outputFormatter;
    }
    /**
     * Execute the environment check command.
     * Performs comprehensive validation of environment configuration and displays results.
     */
    async execute(options = {}) {
        try {
            const checkResult = this.environmentChecker.checkEnvironment();
            // Display the environment check results
            this.outputFormatter.displayEnvironmentCheck(checkResult);
            return {
                success: true,
                result: checkResult,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const errorStack = error instanceof Error ? error.stack : undefined;
            return {
                success: false,
                error: errorMessage,
                stack: errorStack,
            };
        }
    }
    /**
     * Handle command execution result and manage process exit codes.
     * Exits with code 1 if environment validation fails, ensuring CI/CD integration.
     */
    handleResult(result, options) {
        if (result.success) {
            // Exit with error code if environment is not valid
            if (result.result && !result.result.isValid) {
                process.exit(1);
            }
            return;
        }
        this.outputFormatter.displayError("Environment Check Error", result.error || "Unknown error");
        if (options?.debug) {
            console.error(result.stack);
        }
        process.exit(1);
    }
    /**
     * Get a human-readable command description for help text.
     */
    getDescription() {
        return "Check if the environment is properly configured";
    }
    /**
     * Get command options configuration.
     * The check command doesn't require any specific options.
     */
    getOptionsConfig() {
        return [];
    }
    /**
     * Validate command prerequisites before execution.
     * Check command has no prerequisites - it's designed to validate the environment.
     */
    async validatePrerequisites(options) {
        return { valid: true };
    }
    /**
     * Get the command name used for CLI registration.
     */
    getName() {
        return "check";
    }
    /**
     * Check if this command handles the given command name.
     * Used by the CLI framework for command routing.
     */
    handles(commandName) {
        return commandName === "check";
    }
}
//# sourceMappingURL=CheckCommand.js.map