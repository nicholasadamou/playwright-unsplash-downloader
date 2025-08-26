import type { Config } from "../config/Config.js";
import type { FileSystemService } from "../fs/FileSystemService.js";
import type { ImageEntry, ProcessedManifestResult, ImageStatistics, LocalManifestResult, DownloadResult, ManifestFile } from "../types";
/**
 * Statistics provider interface
 */
interface StatsProvider {
    getSummaryForManifest(): any;
}
/**
 * @fileoverview Manifest service for handling manifest loading, parsing, and local manifest creation.
 * Provides comprehensive manifest operations including validation, processing, statistics generation,
 * and local manifest creation for downloaded images.
 *
 * Key Features:
 * - Manifest file loading and validation
 * - Image entry processing and filtering
 * - Limit application and entry validation
 * - Statistics calculation and display
 * - Local manifest generation
 * - Progress tracking integration
 *
 * Manifest Structure:
 * - Supports standard Unsplash manifest format
 * - Processes image entries with metadata
 * - Generates local manifests with download results
 * - Tracks image statistics and metadata
 *
 * @example
 * ```javascript
 * const manifestService = new ManifestService(config, fsService);
 *
 * // Load and process manifest
 * const { imageEntries, originalManifest, totalImages } =
 *   await manifestService.getProcessedImageEntries();
 *
 * console.log(`Processing ${totalImages} images`);
 *
 * // Create local manifest after downloading
 * const { localManifest, localManifestPath } =
 *   await manifestService.createLocalManifest(results, originalManifest, statsTracker);
 * ```
 */
/**
 * Manifest service for handling manifest loading, parsing, and local manifest creation.
 * Follows the Single Responsibility Principle by handling only manifest-related operations.
 * Coordinates with filesystem service to provide complete manifest management functionality.
 */
export declare class ManifestService {
    private readonly config;
    private readonly fs;
    /**
     * Create a new manifest service instance.
     *
     * @param config - Configuration instance
     * @param fileSystemService - File system service
     * @example
     * ```javascript
     * const manifestService = new ManifestService(config, fsService);
     * ```
     */
    constructor(config: Config, fileSystemService: FileSystemService);
    /**
     * Load and parse the manifest file
     * @returns Promise with loaded manifest data
     */
    loadManifest(): Promise<ProcessedManifestResult>;
    /**
     * Apply limit to image entries if specified
     * @param imageEntries Array of image entries
     * @returns Limited array of image entries
     */
    applyLimit(imageEntries: ImageEntry[]): ImageEntry[];
    /**
     * Validate image entries format
     * @param imageEntries Array to validate
     * @returns true if valid
     * @throws {Error} When format is invalid
     */
    validateImageEntries(imageEntries: ImageEntry[]): true;
    /**
     * Get processed image entries with validation and limit applied
     * @returns Processed manifest data
     */
    getProcessedImageEntries(): Promise<ProcessedManifestResult>;
    /**
     * Create a local manifest with download results
     * @param results Download results
     * @param originalManifest Original manifest
     * @param stats Statistics provider
     * @returns Local manifest information
     */
    createLocalManifest(results: DownloadResult[], originalManifest: ManifestFile, stats: StatsProvider): Promise<LocalManifestResult>;
    /**
     * Get image statistics from entries
     * @param imageEntries Array of image entries
     * @returns Image statistics
     */
    getImageStatistics(imageEntries: ImageEntry[]): ImageStatistics;
    /**
     * Display manifest statistics
     * @param imageEntries Array of image entries
     */
    displayManifestStats(imageEntries: ImageEntry[]): void;
}
export {};
//# sourceMappingURL=ManifestService.d.ts.map