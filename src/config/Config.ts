import path from "path";
import fs from "fs-extra";
import { PathResolver } from "../utils/PathResolver.js";
import type {
  ConfigOptions,
  ImageSize,
  BrowserConfiguration,
  ContextConfiguration,
  SizeMapping,
  AuthCredentials,
} from "../types";

/**
 * @fileoverview Centralized configuration manager for the Playwright Image Downloader.
 * Validates user-provided options, applies defaults, and exposes typed accessors
 * used by browser, download, and manifest services.
 *
 * Responsibilities:
 * - Merge options with sane defaults
 * - Validate shape and types of configuration
 * - Provide derived configs for browser/context
 *
 * @example
 * ```typescript
 * const config = new Config({
 *   headless: false,
 *   debug: true,
 *   timeout: 45000
 * });
 * console.log(config.get('timeout')); // 45000
 * ```
 */

/**
 * Centralized configuration manager that validates, normalizes, and provides
 * typed access to configuration options used throughout the application.
 */
export class Config {
  private readonly options: ConfigOptions;
  private readonly pathResolver: PathResolver;

  /**
   * Create a new configuration instance.
   *
   * @param options - Configuration options to merge with defaults
   * @throws {Error} When validation fails for any provided option
   * @example
   * ```typescript
   * // Create with defaults
   * const config = new Config();
   *
   * // Create with custom options
   * const config = new Config({
   *   headless: false,
   *   debug: true,
   *   timeout: 45000,
   *   preferredSize: 'large'
   * });
   * ```
   */
  constructor(options: ConfigOptions = {}) {
    this.pathResolver = new PathResolver();
    this.options = this.validateAndSetDefaults(options);
  }

  /**
   * Validate and merge provided options with defaults. Sets up default paths
   * using smart path resolution and validates all configuration values.
   *
   * @param options - User-provided configuration options
   * @returns Validated and merged configuration object
   * @throws {Error} When any configuration value fails validation
   */
  private validateAndSetDefaults(options: ConfigOptions): ConfigOptions {
    // Use PathResolver for smart defaults instead of hardcoded paths
    const smartPaths = this.getSmartDefaultPaths(options);
    
    const defaults = {
      headless: true,
      debug: false,
      downloadDir: smartPaths.downloadDir,
      manifestPath: smartPaths.manifestPath,
      timeout: 30000,
      retries: 3,
      preferredSize: "original" as ImageSize,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      dryRun: false,
      concurrency: 3,
      enableConcurrency: true,
    } satisfies Required<Omit<ConfigOptions, "limit">>

    const config: ConfigOptions = {
      ...defaults,
      ...options,
    };

    this.validateConfig(config);
    return config;
  }

  /**
   * Get smart default paths using the PathResolver.
   * Resolves paths relative to provided options or uses intelligent defaults.
   * 
   * @param options - User-provided options that may contain custom paths
   * @returns Object with resolved manifestPath and downloadDir
   */
  private getSmartDefaultPaths(options: ConfigOptions): {
    manifestPath: string;
    downloadDir: string;
  } {
    // If user provided paths, resolve them; otherwise use smart defaults
    const manifestPath = options.manifestPath 
      ? path.resolve(options.manifestPath)
      : this.getManifestPathSync();
    
    const downloadDir = options.downloadDir
      ? path.resolve(options.downloadDir) 
      : this.pathResolver.resolveDownloadDir();
      
    return { manifestPath, downloadDir };
  }
  
  /**
   * Synchronous fallback for manifest path resolution.
   * Used during config initialization when async operations aren't available.
   * 
   * @returns string - Resolved manifest path
   */
  private getManifestPathSync(): string {
    const workingDir = process.cwd();
    const filename = "unsplash-manifest.json";
    const commonDirs = ["public", "assets", "data", "static", "resources", "content"];
    
    // Check current directory
    const currentPath = path.resolve(workingDir, filename);
    if (fs.existsSync(currentPath)) {
      return currentPath;
    }
    
    // Check common subdirectories and nested paths
    for (const dir of commonDirs) {
      const dirPath = path.resolve(workingDir, dir, filename);
      if (fs.existsSync(dirPath)) {
        return dirPath;
      }
      
      // Also check nested common paths
      const nestedPaths = [
        path.resolve(workingDir, dir, "images", filename),
        path.resolve(workingDir, dir, "assets", filename),
        path.resolve(workingDir, dir, "data", filename),
        path.resolve(workingDir, dir, "unsplash", filename),
        path.resolve(workingDir, dir, "images", "unsplash", filename)
      ];
      
      for (const nestedPath of nestedPaths) {
        if (fs.existsSync(nestedPath)) {
          return nestedPath;
        }
      }
    }
    
    // Check if public directory exists, prefer it as default
    const publicDir = path.resolve(workingDir, "public");
    if (fs.existsSync(publicDir)) {
      return path.resolve(publicDir, filename);
    }
    
    // Default to current directory
    return currentPath;
  }

  /**
   * Validate all configuration values against expected types and ranges.
   * Ensures timeout and retries are positive numbers, preferred size is valid,
   * and boolean flags are properly typed.
   *
   * @param config - Configuration object to validate
   * @throws {Error} When any validation rule fails
   */
  private validateConfig(config: ConfigOptions): void {
    if (
      config.timeout &&
      (typeof config.timeout !== "number" || config.timeout <= 0)
    ) {
      throw new Error("Timeout must be a positive number");
    }

    if (
      config.retries &&
      (typeof config.retries !== "number" || config.retries < 0)
    ) {
      throw new Error("Retries must be a non-negative number");
    }

    if (
      config.limit &&
      (typeof config.limit !== "number" || config.limit <= 0)
    ) {
      throw new Error("Limit must be a positive number");
    }

    if (config.preferredSize) {
      const validSizes = ["original", "large", "medium", "small"];
      if (!validSizes.includes(config.preferredSize.toLowerCase())) {
        throw new Error(
          `PreferredSize must be one of: ${validSizes.join(", ")}`
        );
      }
    }

    if (typeof config.headless !== "boolean") {
      throw new Error("Headless must be a boolean");
    }

    if (typeof config.debug !== "boolean") {
      throw new Error("Debug must be a boolean");
    }

    if (typeof config.dryRun !== "boolean") {
      throw new Error("DryRun must be a boolean");
    }

    if (
      config.concurrency &&
      (typeof config.concurrency !== "number" || config.concurrency <= 0 || config.concurrency > 10)
    ) {
      throw new Error("Concurrency must be a positive number between 1 and 10");
    }

    if (typeof config.enableConcurrency !== "boolean") {
      throw new Error("EnableConcurrency must be a boolean");
    }
  }

  /**
   * Get a configuration value by its key.
   *
   * @param key - The configuration key to retrieve
   * @returns The value associated with the key
   * @example
   * ```typescript
   * const config = new Config({ timeout: 45000 });
   * console.log(config.get('timeout')); // 45000
   * console.log(config.get('headless')); // true (default)
   * ```
   */
  get<K extends keyof ConfigOptions>(key: K): ConfigOptions[K] {
    return this.options[key];
  }

  /**
   * Get a copy of all configuration options.
   * Returns a shallow copy to prevent external modification.
   *
   * @returns Complete configuration object
   * @example
   * ```typescript
   * const config = new Config({ debug: true });
   * const allOptions = config.getAll();
   * console.log(allOptions.debug); // true
   * ```
   */
  getAll(): ConfigOptions {
    return { ...this.options };
  }

  /**
   * Get a browser-specific configuration for Playwright browser launch.
   * Maps debug an option to devtools and include headless setting.
   *
   * @returns Browser launch options
   * @example
   * ```typescript
   * const config = new Config({ headless: false, debug: true });
   * const browserConfig = config.getBrowserConfig();
   * // { headless: false, devtools: true }
   * ```
   */
  getBrowserConfig(): BrowserConfiguration {
    return {
      headless: this.options.headless!,
      devtools: this.options.debug!,
    };
  }

  /**
   * Get browser context configuration for Playwright context creation.
   * Includes viewport size, timeouts, and user agent settings.
   *
   * @returns Browser context options
   * @example
   * ```typescript
   * const config = new Config({ timeout: 60000 });
   * const contextConfig = config.getContextConfig();
   * // { navigationTimeout: 60000, actionTimeout: 30000, ... }
   * ```
   */
  getContextConfig(): ContextConfiguration {
    return {
      userAgent: this.options.userAgent!,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true,
      navigationTimeout: this.options.timeout!,
      actionTimeout: this.options.timeout! / 2,
    };
  }

  /**
   * Get size mapping configuration that defines width constraints for different image sizes.
   * Used by download service to determine appropriate image dimensions.
   *
   * @returns Mapping of size names to pixel widths
   * @example
   * ```typescript
   * const config = new Config();
   * const sizeMap = config.getSizeMap();
   * console.log(sizeMap.large); // 2400
   * console.log(sizeMap.original); // null (no constraint)
   * ```
   */
  getSizeMap(): SizeMapping {
    return {
      small: 640,
      medium: 1920,
      large: 2400,
      original: null, // No width parameter for original size
    };
  }

  /**
   * Get authentication credentials from environment variables.
   * Reads UNSPLASH_EMAIL and UNSPLASH_PASSWORD from process.env.
   *
   * @returns Email and password from environment
   * @example
   * ```typescript
   * // Assuming environment variables are set
   * const config = new Config();
   * const creds = config.getAuthCredentials();
   * // { email: "user@example.com", password: "secret" }
   * ```
   */
  getAuthCredentials(): AuthCredentials {
    const credentials: AuthCredentials = {};
    if (process.env.UNSPLASH_EMAIL) {
      credentials.email = process.env.UNSPLASH_EMAIL;
    }
    if (process.env.UNSPLASH_PASSWORD) {
      credentials.password = process.env.UNSPLASH_PASSWORD;
    }
    return credentials;
  }

  /**
   * Check if both email and password credentials are available in environment.
   * Used to determine if automatic login can be attempted.
   *
   * @returns true if both email and password are set
   * @example
   * ```typescript
   * const config = new Config();
   * if (config.hasAuthCredentials()) {
   *   console.log("Auto-login available");
   * } else {
   *   console.log("Manual login required");
   * }
   * ```
   */
  hasAuthCredentials(): boolean {
    const credentials = this.getAuthCredentials();
    return !!(credentials.email && credentials.password);
  }
}
