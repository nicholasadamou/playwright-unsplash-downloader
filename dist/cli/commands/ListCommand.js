import fs from "fs-extra";
/**
 * List command handler for displaying manifest contents.
 * Follows Command pattern by encapsulating the list operation.
 * Provides comprehensive manifest content display with filtering options.
 */
export class ListCommand {
    optionParser;
    outputFormatter;
    /**
     * Create a new list command instance.
     */
    constructor(optionParser, outputFormatter) {
        this.optionParser = optionParser;
        this.outputFormatter = outputFormatter;
    }
    /**
     * Execute the list command to display manifest contents.
     * Loads and parses the manifest file, then displays formatted image entries.
     */
    async execute(options = {}) {
        try {
            const parsedOptions = this.optionParser.parseListOptions(options);
            // Check if manifest exists
            if (!(await fs.pathExists(parsedOptions.manifestPath))) {
                return {
                    success: false,
                    error: `Manifest not found: ${parsedOptions.manifestPath}`,
                };
            }
            // Load and parse manifest
            const manifest = await fs.readJson(parsedOptions.manifestPath);
            const images = Object.entries(manifest.images || {});
            // Display results
            this.outputFormatter.displayImageListHeader(images.length, parsedOptions.manifestPath, manifest.generated_at);
            // Display each image
            images.forEach(([photoId, imageData], index) => {
                this.outputFormatter.displayImageEntry(index, photoId, imageData);
            });
            return {
                success: true,
                result: {
                    manifest,
                    images,
                    manifestPath: parsedOptions.manifestPath,
                    imageCount: images.length,
                },
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
     * Handle command execution result and manage error display.
     * Shows formatted error messages and exits with error code on failure.
     */
    handleResult(result, options) {
        if (result.success) {
            return;
        }
        this.outputFormatter.displayError("Error listing images", result.error || "Unknown error");
        if (options?.debug) {
            console.error(result.stack);
        }
        process.exit(1);
    }
    /**
     * Get a human-readable command description for help text.
     */
    getDescription() {
        return "List images that would be downloaded from the manifest";
    }
    /**
     * Get command-specific CLI options configuration.
     * Defines all available flags and options for the list command.
     */
    getOptionsConfig() {
        return [
            {
                flag: "--manifest-path <path>",
                description: "Path to the manifest file",
            },
            {
                flag: "--format <format>",
                description: "Output format (table, json, csv)",
                defaultValue: "table",
            },
            {
                flag: "--limit <number>",
                description: "Limit the number of items to display",
            },
            {
                flag: "--author <author>",
                description: "Filter by author name",
            },
            {
                flag: "--min-width <width>",
                description: "Filter by minimum width",
            },
            {
                flag: "--min-height <height>",
                description: "Filter by minimum height",
            },
        ];
    }
    /**
     * Validate command prerequisites before execution.
     * Checks that the specified manifest file exists and is accessible.
     */
    async validatePrerequisites(options) {
        const parsedOptions = this.optionParser.parseListOptions(options);
        if (!(await fs.pathExists(parsedOptions.manifestPath))) {
            return {
                valid: false,
                error: `Manifest file not found: ${parsedOptions.manifestPath}`,
            };
        }
        return { valid: true };
    }
    /**
     * Get the command name used for CLI registration.
     */
    getName() {
        return "list";
    }
    /**
     * Check if this command handles the given command name.
     * Used by the CLI framework for command routing.
     */
    handles(commandName) {
        return commandName === "list";
    }
}
//# sourceMappingURL=ListCommand.js.map