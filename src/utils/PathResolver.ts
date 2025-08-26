import path from "path";
import fs from "fs-extra";

/**
 * @fileoverview PathResolver utility for intelligent path resolution.
 * Provides smart defaults for manifest and download paths based on common project structures.
 * Eliminates hardcoded relative paths and adapts to different project layouts.
 */

/**
 * Path resolution result interface
 */
export interface PathResolutionResult {
  manifestPath: string;
  downloadDir: string;
  foundManifest?: boolean;
}

/**
 * Path resolver configuration options
 */
export interface PathResolverOptions {
  workingDirectory?: string;
  manifestFilename?: string;
  downloadDirName?: string;
}

/**
 * Centralized path resolver that intelligently determines default paths
 * based on common project structures and existing files.
 * 
 * Priority order for manifest search:
 * 1. Explicitly provided path
 * 2. Current working directory
 * 3. Common project locations (public/, assets/, data/, etc.)
 * 4. Parent directories up to 3 levels
 * 
 * @example
 * ```typescript
 * const resolver = new PathResolver();
 * 
 * // Get smart defaults
 * const paths = await resolver.resolveDefaultPaths();
 * console.log(paths.manifestPath); // intelligently resolved path
 * 
 * // Resolve specific manifest
 * const manifestPath = await resolver.resolveManifestPath('./custom-manifest.json');
 * ```
 */
export class PathResolver {
  private readonly workingDirectory: string;
  private readonly manifestFilename: string;
  private readonly downloadDirName: string;

  /**
   * Common directory names where manifests might be located
   */
  private readonly commonManifestDirs = [
    "public",
    "assets", 
    "data",
    "static",
    "resources",
    "content"
  ];

  /**
   * Common directory names for downloads
   */
  private readonly commonDownloadDirs = [
    "public/images",
    "assets/images", 
    "static/images",
    "images",
    "downloads"
  ];

  /**
   * Create a new PathResolver instance.
   * 
   * @param options - Configuration options
   */
  constructor(options: PathResolverOptions = {}) {
    this.workingDirectory = options.workingDirectory || process.cwd();
    this.manifestFilename = options.manifestFilename || "unsplash-manifest.json";
    this.downloadDirName = options.downloadDirName || "unsplash";
  }

  /**
   * Resolve manifest path with smart defaults.
   * If path is provided, resolves it relative to working directory.
   * If not provided, searches common locations.
   * 
   * @param providedPath - Optional manifest path provided by user
   * @returns Promise<string> - Resolved absolute manifest path
   */
  async resolveManifestPath(providedPath?: string): Promise<string> {
    if (providedPath) {
      return path.resolve(this.workingDirectory, providedPath);
    }

    return await this.findManifestInCommonLocations();
  }

  /**
   * Resolve download directory with smart defaults.
   * 
   * @param providedPath - Optional download directory provided by user
   * @returns string - Resolved absolute download directory path
   */
  resolveDownloadDir(providedPath?: string): string {
    if (providedPath) {
      return path.resolve(this.workingDirectory, providedPath);
    }

    // Try to find existing download directories
    for (const commonDir of this.commonDownloadDirs) {
      const fullPath = path.resolve(this.workingDirectory, commonDir, this.downloadDirName);
      const parentPath = path.resolve(this.workingDirectory, commonDir);
      
      // If parent directory exists, use it
      if (fs.existsSync(parentPath)) {
        return fullPath;
      }
    }

    // Default to current working directory + downloads/unsplash
    return path.resolve(this.workingDirectory, "downloads", this.downloadDirName);
  }

  /**
   * Get smart default paths for both manifest and download directory.
   * 
   * @returns Promise<PathResolutionResult> - Resolved paths with metadata
   */
  async resolveDefaultPaths(): Promise<PathResolutionResult> {
    const manifestPath = await this.findManifestInCommonLocations();
    const downloadDir = this.resolveDownloadDir();
    const foundManifest = await fs.pathExists(manifestPath);

    return {
      manifestPath,
      downloadDir,
      foundManifest
    };
  }

  /**
   * Find manifest file in common project locations.
   * Searches current directory, then common subdirectories (including nested paths), then parent directories.
   * 
   * @returns Promise<string> - Path where manifest should be located
   */
  private async findManifestInCommonLocations(): Promise<string> {
    // 1. Check current working directory first
    const currentDirPath = path.resolve(this.workingDirectory, this.manifestFilename);
    if (await fs.pathExists(currentDirPath)) {
      return currentDirPath;
    }

    // 2. Check common subdirectories and their nested paths
    for (const commonDir of this.commonManifestDirs) {
      const commonDirPath = path.resolve(this.workingDirectory, commonDir, this.manifestFilename);
      if (await fs.pathExists(commonDirPath)) {
        return commonDirPath;
      }
      
      // Also check nested common paths (e.g., public/images/, public/assets/images/)
      const nestedPaths = [
        path.resolve(this.workingDirectory, commonDir, "images", this.manifestFilename),
        path.resolve(this.workingDirectory, commonDir, "assets", this.manifestFilename),
        path.resolve(this.workingDirectory, commonDir, "data", this.manifestFilename),
        path.resolve(this.workingDirectory, commonDir, "unsplash", this.manifestFilename),
        path.resolve(this.workingDirectory, commonDir, "images", "unsplash", this.manifestFilename)
      ];
      
      for (const nestedPath of nestedPaths) {
        if (await fs.pathExists(nestedPath)) {
          return nestedPath;
        }
      }
    }

    // 3. Check parent directories (up to 3 levels)
    for (let level = 1; level <= 3; level++) {
      const parentDir = path.resolve(this.workingDirectory, "../".repeat(level));
      
      // Check parent directory directly
      const parentPath = path.resolve(parentDir, this.manifestFilename);
      if (await fs.pathExists(parentPath)) {
        return parentPath;
      }

      // Check common subdirectories in parent
      for (const commonDir of this.commonManifestDirs) {
        const parentCommonPath = path.resolve(parentDir, commonDir, this.manifestFilename);
        if (await fs.pathExists(parentCommonPath)) {
          return parentCommonPath;
        }
      }
    }

    // 4. If no existing manifest found, return most likely location
    // Prefer public directory if it exists, otherwise current directory
    const publicDir = path.resolve(this.workingDirectory, "public");
    if (await fs.pathExists(publicDir)) {
      return path.resolve(publicDir, this.manifestFilename);
    }

    return currentDirPath;
  }

  /**
   * Validate that a manifest path exists and is accessible.
   * 
   * @param manifestPath - Path to validate
   * @returns Promise<boolean> - true if path exists and is accessible
   */
  async validateManifestExists(manifestPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(manifestPath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get suggested paths when manifest is not found.
   * Provides helpful suggestions for where to place the manifest file.
   * 
   * @returns string[] - Array of suggested manifest locations
   */
  getSuggestedManifestPaths(): string[] {
    const suggestions: string[] = [];

    // Current directory
    suggestions.push(path.resolve(this.workingDirectory, this.manifestFilename));

    // Common project directories
    for (const commonDir of this.commonManifestDirs) {
      const dirPath = path.resolve(this.workingDirectory, commonDir);
      suggestions.push(path.resolve(dirPath, this.manifestFilename));
    }

    return suggestions;
  }

  /**
   * Get the relative path from a base directory for display purposes.
   * 
   * @param fullPath - Full absolute path
   * @param basePath - Base path to make relative from (defaults to working directory)
   * @returns string - Relative path for display
   */
  getRelativePath(fullPath: string, basePath?: string): string {
    const base = basePath || this.workingDirectory;
    const relative = path.relative(base, fullPath);
    
    // If relative path is longer than absolute path, return absolute
    return relative.length < fullPath.length ? relative : fullPath;
  }

  /**
   * Create directory structure for a given path if it doesn't exist.
   * 
   * @param dirPath - Directory path to create
   * @returns Promise<void>
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }
}
