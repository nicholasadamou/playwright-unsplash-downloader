import type { Download } from "playwright";
import type { Config } from "../config/Config.js";
import type { BrowserManager } from "../browser/BrowserManager.js";
import type { FileSystemService } from "../fs/FileSystemService.js";
import type { StatsTracker } from "../stats/StatsTracker.js";
import type { ImageData, DownloadResult, SizeSelection, ImageEntry } from "../types";
/**
 * Download service for handling image download logic, retry mechanism, and size validation.
 * Follows the Single Responsibility Principle by handling only download-related operations.
 * Coordinates with browser, filesystem, and stats services to provide complete download functionality.
 */
export declare class DownloadService {
    private readonly config;
    private readonly browser;
    private readonly fs;
    private readonly stats;
    /**
     * Create a new download service instance.
     *
     * @param config - Configuration instance
     * @param browserManager - Browser manager for web operations
     * @param fileSystemService - File system operations service
     * @param statsTracker - Statistics tracking service
     * @example
     * ```javascript
     * const downloadService = new DownloadService(config, browserManager, fsService, statsTracker);
     * ```
     */
    constructor(config: Config, browserManager: BrowserManager, fileSystemService: FileSystemService, statsTracker: StatsTracker);
    /**
     * Validate and select the best available size for an image based on preferences and constraints.
     * Implements intelligent fallback logic when the preferred size exceeds image dimensions.
     *
     * @param photoId - Unsplash photo ID for logging purposes
     * @param imageData - Image metadata including dimensions
     * @param preferredSize - Desired size (original, large, medium, small)
     * @returns Selected size and width constraint
     * @example
     * ```javascript
     * const selection = await downloadService.validateAndSelectSize(
     *   'abc123',
     *   { width: 2000, height: 1500 },
     *   'large'
     * );
     * console.log(selection); // { selectedSize: 'large', selectedWidth: 2400 }
     * ```
     */
    validateAndSelectSize(photoId: string, imageData: ImageData, preferredSize: string): Promise<SizeSelection>;
    /**
     * Extract ixid parameter from the photo page.
     * The ixid is required for constructing direct download URLs and tracking analytics.
     * Attempts multiple extraction strategies for robustness.
     *
     * @param photoId - Unsplash photo ID to extract ixid for
     * @returns The extracted ixid parameter
     * @throws {Error} When ixid cannot be found through any method
     * @example
     * ```javascript
     * const ixid = await downloadService.extractIxid('abc123');
     * console.log('Photo ixid:', ixid); // 'M3wxMjA3fDB8MHxwaG90...'
     * ```
     */
    extractIxid(photoId: string): Promise<string>;
    /**
     * Download image using direct URL approach.
     * Constructs direct download URLs with proper size constraints and ixid parameters.
     * Uses intelligent size selection and fallback strategies.
     *
     * @param photoId - Unsplash photo ID to download
     * @param imageData - Image metadata including dimensions and author
     * @returns Playwright download object
     * @throws {Error} When download button cannot be found or clicked
     * @example
     * ```javascript
     * const download = await downloadService.downloadImageDirect(
     *   'abc123',
     *   { width: 3000, height: 2000, image_author: 'John Doe' }
     * );
     * ```
     */
    downloadImageDirect(photoId: string, imageData: ImageData): Promise<Download>;
    /**
     * Download a single image with a comprehensive retry mechanism.
     * Implements exponential backoff and handles dry-run mode simulation.
     * Tracks statistics and provides detailed error reporting.
     *
     * @param photoId - Unsplash photo ID to download
     * @param imageData - Image metadata including dimensions and author
     * @param attempt - Current retry attempt number
     * @returns Complete download result with status and metadata
     * @example
     * ```javascript
     * const result = await downloadService.downloadImage(
     *   'abc123',
     *   { width: 3000, height: 2000, image_author: 'John Doe' }
     * );
     *
     * if (result.success) {
     *   console.log(`Downloaded: ${result.filename} (${result.size} bytes)`);
     * } else {
     *   console.error(`Failed: ${result.error}`);
     * }
     * ```
     */
    downloadImage(photoId: string, imageData: ImageData, attempt?: number): Promise<DownloadResult>;
    /**
     * Take the debug screenshot if debug mode is enabled.
     * Captures browser state for troubleshooting download failures.
     * Screenshots are saved with attempt-specific filenames.
     *
     * @param photoId - Photo ID being downloaded (for filename)
     * @param attempt - Current retry attempt number (for filename)
     * @returns Resolves when screenshot is saved or skipped
     * @example
     * ```javascript
     * // Only takes screenshot if config.debug is true
     * await downloadService.takeDebugScreenshot('abc123', 2);
     * // Saves to: debug/screenshots/abc123-attempt-2.png
     * ```
     */
    takeDebugScreenshot(photoId: string, attempt: number): Promise<void>;
    /**
     * Implement exponential backoff delay between retry attempts.
     * Uses linear progression: 2s, 4s, 6s, etc. to avoid overwhelming servers.
     *
     * @param attempt - Current attempt number (used to calculate delay)
     * @returns Resolves after the calculated delay
     * @example
     * ```javascript
     * // Wait 4 seconds before attempt 2
     * await downloadService.exponentialBackoff(2);
     * ```
     */
    exponentialBackoff(attempt: number): Promise<void>;
    /**
     * Process images sequentially with existence checking and rate limiting.
     * Downloads images one by one to avoid overwhelming the server,
     * skips already existing files, and implements respectful delays.
     *
     * @param imageEntries - Array of [photoId, imageData] tuples
     * @returns Array of download results
     * @example
     * ```javascript
     * const imageEntries = [
     *   ['abc123', { width: 3000, image_author: 'John' }],
     *   ['def456', { width: 2400, image_author: 'Jane' }]
     * ];
     * const results = await downloadService.downloadImages(imageEntries);
     * console.log(`Processed ${results.length} images`);
     * ```
     */
    downloadImages(imageEntries: ImageEntry[]): Promise<DownloadResult[]>;
    /**
     * Download images with progress tracking and timing statistics.
     * Wraps the main download process with timing measurement and progress display.
     *
     * @param imageEntries - Array of [photoId, imageData] tuples
     * @returns Array of download results
     * @example
     * ```javascript
     * const imageEntries = manifest.getImageEntries();
     * const results = await downloadService.downloadImagesWithProgress(imageEntries);
     * console.log('Download session complete');
     * ```
     */
    downloadImagesWithProgress(imageEntries: ImageEntry[]): Promise<DownloadResult[]>;
    /**
     * Generate comprehensive download session summary.
     * Analyzes results to provide counts, storage calculations, and failure details.
     *
     * @param results - Array of download results to analyze
     * @returns Summary object with counts and statistics
     * @example
     * ```javascript
     * const summary = downloadService.getDownloadSummary(results);
     * console.log(`✅ ${summary.successful} downloaded, ❌ ${summary.failed} failed`);
     * console.log(`💾 Total storage: ${summary.totalStorage}`);
     * ```
     */
    getDownloadSummary(results: DownloadResult[]): {
        successful: number;
        failed: number;
        skipped: number;
        totalStorage: number;
        failedResults: DownloadResult[];
    };
}
//# sourceMappingURL=DownloadService.d.ts.map