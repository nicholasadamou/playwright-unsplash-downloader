import fs from "fs-extra";
import chalk from "chalk";
import { PathResolver } from "../utils/PathResolver.js";

/**
 * @fileoverview ManifestPreloader for early manifest validation and error reporting.
 * Provides upfront validation of manifest files before the main application workflow begins.
 * Offers helpful error messages and suggestions when manifests are not found or invalid.
 */

/**
 * Manifest preload result interface
 */
export interface ManifestPreloadResult {
  success: boolean;
  manifestPath: string;
  exists: boolean;
  isValid?: boolean;
  content?: any;
  error?: string;
  suggestions?: string[];
}

/**
 * Manifest validation options
 */
export interface ManifestValidationOptions {
  validateContent?: boolean;
  provideSuggestions?: boolean;
  workingDirectory?: string;
}

/**
 * ManifestPreloader handles early validation and preloading of manifest files.
 * Provides comprehensive error reporting and helpful suggestions when manifests
 * are missing or invalid, improving the user experience.
 * 
 * Key Features:
 * - Early manifest existence validation
 * - Content format validation
 * - Helpful error messages with suggestions
 * - Smart path resolution integration
 * - Detailed reporting for troubleshooting
 * 
 * @example
 * ```typescript
 * const preloader = new ManifestPreloader();
 * 
 * // Preload with smart path resolution
 * const result = await preloader.preloadManifest();
 * if (!result.success) {
 *   console.error(result.error);
 *   result.suggestions?.forEach(suggestion => console.log(suggestion));
 *   process.exit(1);
 * }
 * 
 * // Use preloaded manifest
 * console.log(`Found ${Object.keys(result.content.images).length} images`);
 * ```
 */
export class ManifestPreloader {
  private readonly pathResolver: PathResolver;
  private readonly options: ManifestValidationOptions;

  /**
   * Create a new ManifestPreloader instance.
   * 
   * @param options - Validation and configuration options
   */
  constructor(options: ManifestValidationOptions = {}) {
    this.options = {
      validateContent: true,
      provideSuggestions: true,
      workingDirectory: process.cwd(),
      ...options
    };
    
    this.pathResolver = new PathResolver({
      workingDirectory: this.options.workingDirectory || process.cwd()
    });
  }

  /**
   * Preload and validate manifest file using smart path resolution.
   * Attempts to find and validate the manifest file, providing detailed
   * error reporting and suggestions if issues are encountered.
   * 
   * @param providedPath - Optional specific manifest path
   * @returns Promise<ManifestPreloadResult> - Detailed preload result
   */
  async preloadManifest(providedPath?: string): Promise<ManifestPreloadResult> {
    try {
      // Resolve manifest path
      const manifestPath = await this.pathResolver.resolveManifestPath(providedPath);
      
      // Check if manifest exists
      const exists = await this.pathResolver.validateManifestExists(manifestPath);
      
      if (!exists) {
        return this.handleMissingManifest(manifestPath);
      }

      // Load and validate content if requested
      if (this.options.validateContent) {
        return await this.validateManifestContent(manifestPath);
      }

      return {
        success: true,
        manifestPath,
        exists: true
      };
    } catch (error) {
      return {
        success: false,
        manifestPath: providedPath || "unknown",
        exists: false,
        error: `Failed to preload manifest: ${(error as Error).message}`,
        ...(this.options.provideSuggestions && { suggestions: this.getGeneralSuggestions() })
      };
    }
  }

  /**
   * Validate manifest content format and structure.
   * Checks for required fields and proper JSON structure.
   * 
   * @param manifestPath - Path to the manifest file
   * @returns Promise<ManifestPreloadResult> - Validation result with content
   */
  private async validateManifestContent(manifestPath: string): Promise<ManifestPreloadResult> {
    try {
      const content = await fs.readJson(manifestPath);
      
      // Validate manifest structure
      const validationError = this.validateManifestStructure(content);
      if (validationError) {
        return {
          success: false,
          manifestPath,
          exists: true,
          isValid: false,
          content,
          error: `Invalid manifest format: ${validationError}`,
          ...(this.options.provideSuggestions && { suggestions: this.getStructureSuggestions() })
        };
      }

      const imageCount = Object.keys(content.images || {}).length;
      
      return {
        success: true,
        manifestPath,
        exists: true,
        isValid: true,
        content,
        ...(imageCount === 0 && { error: "Manifest contains no images" })
      };
    } catch (error) {
      return {
        success: false,
        manifestPath,
        exists: true,
        isValid: false,
        error: `Failed to parse manifest JSON: ${(error as Error).message}`,
        ...(this.options.provideSuggestions && { suggestions: this.getParsingErrorSuggestions() })
      };
    }
  }

  /**
   * Validate the structure of a manifest object.
   * Checks for required fields and proper data types.
   * 
   * @param content - Parsed manifest content
   * @returns string | null - Error message or null if valid
   */
  private validateManifestStructure(content: any): string | null {
    if (!content || typeof content !== "object") {
      return "Manifest must be a valid JSON object";
    }

    if (!content.images) {
      return "Manifest must contain an 'images' field";
    }

    if (typeof content.images !== "object") {
      return "Manifest 'images' field must be an object";
    }

    // Check for at least one image entry structure
    const imageEntries = Object.entries(content.images);
    if (imageEntries.length > 0) {
      const firstEntry = imageEntries[0];
      if (!firstEntry) return "No image entries found";
      const [photoId, imageData] = firstEntry;
      
      if (!photoId || typeof photoId !== "string") {
        return "Image entries must have string photo IDs";
      }
      
      if (!imageData || typeof imageData !== "object") {
        return "Image entries must contain valid image data objects";
      }
    }

    return null; // Valid
  }

  /**
   * Handle missing manifest file scenario.
   * Provides detailed error information and helpful suggestions.
   * 
   * @param manifestPath - The path where manifest was expected
   * @returns ManifestPreloadResult - Error result with suggestions
   */
  private handleMissingManifest(manifestPath: string): ManifestPreloadResult {
    const relativePath = this.pathResolver.getRelativePath(manifestPath);
    
    return {
      success: false,
      manifestPath,
      exists: false,
      error: `Manifest file not found: ${relativePath}`,
      ...(this.options.provideSuggestions && { 
        suggestions: this.getMissingManifestSuggestions(manifestPath) 
      })
    };
  }

  /**
   * Get suggestions for when manifest file is missing.
   * 
   * @param manifestPath - The missing manifest path
   * @returns string[] - Array of helpful suggestions
   */
  private getMissingManifestSuggestions(manifestPath: string): string[] {
    const suggestions: string[] = [];
    const suggestedPaths = this.pathResolver.getSuggestedManifestPaths();
    
    suggestions.push("💡 Suggestions:");
    suggestions.push(`• Create manifest file at: ${this.pathResolver.getRelativePath(manifestPath)}`);
    suggestions.push("• Use --manifest-path flag to specify a different location");
    suggestions.push("");
    suggestions.push("📂 Common manifest locations to try:");
    
    suggestedPaths.slice(0, 5).forEach(path => {
      const relative = this.pathResolver.getRelativePath(path);
      suggestions.push(`• ${relative}`);
    });
    
    suggestions.push("");
    suggestions.push("📝 Example manifest structure:");
    suggestions.push(`{
  "generated_at": "${new Date().toISOString()}",
  "images": {
    "photo-id-1": {
      "image_author": "Author Name",
      "width": 1920,
      "height": 1080,
      "url": "https://unsplash.com/photos/photo-id-1"
    }
  }
}`);

    return suggestions;
  }

  /**
   * Get suggestions for manifest structure validation errors.
   * 
   * @returns string[] - Array of structure-related suggestions
   */
  private getStructureSuggestions(): string[] {
    return [
      "💡 Manifest structure requirements:",
      "• Must be valid JSON",
      "• Must contain 'images' object field",
      "• Each image entry should have a string photo ID as key",
      "• Each image should contain metadata (author, dimensions, etc.)",
      "",
      "📝 Valid manifest example:",
      `{
  "generated_at": "${new Date().toISOString()}",
  "images": {
    "example-photo-id": {
      "image_author": "Photographer Name",
      "width": 1920,
      "height": 1080,
      "url": "https://unsplash.com/photos/example-photo-id"
    }
  }
}`
    ];
  }

  /**
   * Get suggestions for JSON parsing errors.
   * 
   * @returns string[] - Array of parsing-related suggestions
   */
  private getParsingErrorSuggestions(): string[] {
    return [
      "💡 JSON parsing suggestions:",
      "• Ensure the file contains valid JSON syntax",
      "• Check for missing commas, brackets, or quotes",
      "• Validate JSON using an online JSON validator",
      "• Ensure file encoding is UTF-8",
      "• Check file permissions and accessibility"
    ];
  }

  /**
   * Get general suggestions for manifest-related issues.
   * 
   * @returns string[] - Array of general suggestions
   */
  private getGeneralSuggestions(): string[] {
    return [
      "💡 General troubleshooting:",
      "• Verify the manifest file path is correct",
      "• Check file permissions",
      "• Ensure the manifest file contains valid Unsplash data",
      "• Use --debug flag for more detailed error information"
    ];
  }

  /**
   * Display preload result with formatted output.
   * Provides user-friendly console output for preload results.
   * 
   * @param result - The preload result to display
   */
  displayPreloadResult(result: ManifestPreloadResult): void {
    if (result.success) {
      const relativePath = this.pathResolver.getRelativePath(result.manifestPath);
      console.log(chalk.green(`✅ Manifest loaded successfully: ${relativePath}`));
      
      if (result.content?.images) {
        const imageCount = Object.keys(result.content.images).length;
        console.log(chalk.blue(`📄 Found ${imageCount} images in manifest`));
        
        if (imageCount === 0) {
          console.log(chalk.yellow("⚠️  Warning: Manifest contains no images"));
        }
      }
    } else {
      console.log(chalk.red(`❌ ${result.error}`));
      
      if (result.suggestions) {
        console.log("");
        result.suggestions.forEach(suggestion => {
          if (suggestion.startsWith("•")) {
            console.log(chalk.gray(`  ${suggestion}`));
          } else if (suggestion.startsWith("{")) {
            console.log(chalk.gray(suggestion));
          } else {
            console.log(suggestion);
          }
        });
      }
    }
  }

  /**
   * Quick validation check for manifest existence only.
   * Lightweight check without content validation.
   * 
   * @param manifestPath - Optional specific manifest path
   * @returns Promise<boolean> - true if manifest exists
   */
  async manifestExists(manifestPath?: string): Promise<boolean> {
    try {
      const resolvedPath = await this.pathResolver.resolveManifestPath(manifestPath);
      return await this.pathResolver.validateManifestExists(resolvedPath);
    } catch {
      return false;
    }
  }
}
