import chalk from "chalk";
import dotenv from "dotenv";
import { Config } from "./config/Config.js";
import { BrowserManager } from "./browser/BrowserManager.js";
import { AuthenticationService } from "./auth/AuthenticationService.js";
import { StatsTracker } from "./stats/StatsTracker.js";
import { FileSystemService } from "./fs/FileSystemService.js";
import { ManifestService } from "./manifest/ManifestService.js";
import { DownloadService } from "./download/DownloadService.js";
// Load environment variables
dotenv.config();
/**
 * Main orchestrator class that coordinates all services to handle the complete
 * Playwright image download process. Manages the workflow from initialization
 * through authentication, manifest processing, downloads, and reporting.
 */
export class PlaywrightImageDownloader {
    config;
    browserManager;
    authService;
    statsTracker;
    fileSystemService;
    manifestService;
    downloadService;
    /**
     * Create a new Playwright Image Downloader instance.
     * Initializes all services with a dependency injection pattern.
     *
     * @param options - Configuration options
     * @throws {Error} When configuration validation fails
     * @example
     * ```typescript
     * // Create with default
     * const downloader = new PlaywrightImageDownloader();
     *
     * // Create with custom options
     * const downloader = new PlaywrightImageDownloader({
     *   headless: false,
     *   debug: true,
     *   timeout: 60000,
     *   retries: 5,
     *   preferredSize: 'large',
     *   limit: 50,
     *   dryRun: true
     * });
     * ```
     */
    constructor(options = {}) {
        // Initialize configuration
        this.config = new Config(options);
        // Initialize services with dependency injection
        this.browserManager = new BrowserManager(this.config);
        this.authService = new AuthenticationService(this.config, this.browserManager);
        this.statsTracker = new StatsTracker();
        this.fileSystemService = new FileSystemService(this.config);
        this.manifestService = new ManifestService(this.config, this.fileSystemService);
        this.downloadService = new DownloadService(this.config, this.browserManager, this.fileSystemService, this.statsTracker);
    }
    /**
     * Initialize all services
     */
    async initialize() {
        console.log(chalk.blue("🚀 Initializing Playwright Image Downloader..."));
        await this.browserManager.initialize();
        console.log(chalk.green("✅ All services initialized"));
    }
    /**
     * Handle authentication workflow
     * @returns true if authenticated in this session
     */
    async handleAuthentication() {
        console.log(chalk.blue("\n🔐 Authentication Step:"));
        const loginSuccessful = await this.authService.attemptLogin();
        if (!loginSuccessful) {
            console.log(chalk.yellow("⚠️  Continuing without authentication - some downloads may fail"));
        }
        return loginSuccessful;
    }
    /**
     * Load and process manifest
     */
    async loadAndProcessManifest() {
        const { imageEntries, originalManifest, totalImages } = await this.manifestService.getProcessedImageEntries();
        if (totalImages === 0) {
            console.log(chalk.yellow("⚠️  No images found in manifest"));
            return null;
        }
        // Set up statistics
        this.statsTracker.setTotal(totalImages);
        // Display manifest statistics if enabled
        if (this.config.get("debug")) {
            this.manifestService.displayManifestStats(imageEntries);
        }
        return { imageEntries, originalManifest };
    }
    /**
     * Display configuration summary
     */
    displayConfiguration() {
        this.statsTracker.displayConfiguration(this.config);
    }
    /**
     * Execute the download workflow
     * @param imageEntries Entries to download
     */
    async executeDownloads(imageEntries) {
        const results = await this.downloadService.downloadImagesWithProgress(imageEntries);
        return results;
    }
    /**
     * Generate final reports and manifests
     * @param results Download results
     * @param originalManifest Source manifest object
     */
    async generateReports(results, originalManifest) {
        // Create local manifest
        const { localManifest, localManifestPath } = await this.manifestService.createLocalManifest(results, originalManifest, this.statsTracker);
        // Calculate total storage
        const totalStorage = this.fileSystemService.calculateTotalStorage(results);
        // Display final results
        this.statsTracker.displayResults(totalStorage);
        // Display failed items if any
        const summary = this.downloadService.getDownloadSummary(results);
        if (summary.failedResults.length > 0) {
            this.statsTracker.displayFailedItems(summary.failedResults);
        }
        return { localManifest, localManifestPath, totalStorage, summary };
    }
    /**
     * Run the complete download process
     */
    async run() {
        try {
            // Initialize services
            await this.initialize();
            // Load and process manifest
            const manifestData = await this.loadAndProcessManifest();
            if (!manifestData) {
                return;
            }
            const { imageEntries, originalManifest } = manifestData;
            // Display configuration
            this.displayConfiguration();
            // Handle authentication
            const loginSuccessful = await this.handleAuthentication();
            // Execute downloads
            const results = await this.executeDownloads(imageEntries);
            // Generate reports and manifests
            const { localManifest, localManifestPath, totalStorage, summary } = await this.generateReports(results, originalManifest);
            // Display completion message
            this.statsTracker.displayCompletion();
            return {
                results,
                localManifest,
                localManifestPath,
                totalStorage,
                summary,
                loginSuccessful,
                stats: this.statsTracker.getStats(),
            };
        }
        catch (error) {
            console.error(chalk.red("❌ Fatal error:"), error.message);
            if (this.config.get("debug")) {
                console.error(error.stack);
            }
            throw error;
        }
        finally {
            await this.cleanup();
        }
    }
    /**
     * Cleanup all resources
     */
    async cleanup() {
        try {
            await this.browserManager.cleanup();
            console.log(chalk.gray("🧹 Cleanup completed"));
        }
        catch (error) {
            console.log(chalk.yellow(`Warning during cleanup: ${error.message}`));
        }
    }
    /**
     * Get current configuration
     * @returns {object} Plain object of configuration values
     */
    getConfig() {
        return this.config.getAll();
    }
    /**
     * Get current statistics
     * @returns {{total:number, downloaded:number, failed:number, skipped:number}}
     */
    getStats() {
        return this.statsTracker.getStats();
    }
    /**
     * Check if authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.authService.isAuthenticated();
    }
    /**
     * Reset authentication state (useful for testing)
     * @returns {void}
     */
    resetAuthentication() {
        this.authService.reset();
    }
    /**
     * Reset statistics (useful for multiple runs)
     * @returns {void}
     */
    resetStats() {
        this.statsTracker.reset();
    }
    /**
     * Get browser manager (for advanced use cases)
     * @returns {BrowserManager}
     */
    getBrowserManager() {
        return this.browserManager;
    }
    /**
     * Get manifest service (for advanced use cases)
     * @returns {ManifestService}
     */
    getManifestService() {
        return this.manifestService;
    }
    /**
     * Get download service (for advanced use cases)
     * @returns {DownloadService}
     */
    getDownloadService() {
        return this.downloadService;
    }
}
//# sourceMappingURL=PlaywrightImageDownloader.js.map