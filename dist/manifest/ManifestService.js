import chalk from "chalk";
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
export class ManifestService {
    config;
    fs;
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
    constructor(config, fileSystemService) {
        this.config = config;
        this.fs = fileSystemService;
    }
    /**
     * Load and parse the manifest file
     * @returns Promise with loaded manifest data
     */
    async loadManifest() {
        try {
            console.log(chalk.blue("📄 Loading manifest..."));
            const manifestPath = await this.fs.validateManifestPath();
            const manifestContent = await this.fs.readJson(manifestPath);
            const imageEntries = Object.entries(manifestContent.images || {});
            console.log(chalk.green(`✅ Loaded ${imageEntries.length} images from manifest`));
            return {
                imageEntries,
                originalManifest: manifestContent,
                totalImages: imageEntries.length,
            };
        }
        catch (error) {
            console.error(chalk.red("❌ Error loading manifest:"), error.message);
            throw error;
        }
    }
    /**
     * Apply limit to image entries if specified
     * @param imageEntries Array of image entries
     * @returns Limited array of image entries
     */
    applyLimit(imageEntries) {
        const limit = this.config.get("limit");
        if (!limit || limit <= 0) {
            return imageEntries;
        }
        if (imageEntries.length > limit) {
            console.log(chalk.yellow(`⚠️  Limited to first ${limit} images (out of ${imageEntries.length} total)`));
            return imageEntries.slice(0, limit);
        }
        return imageEntries;
    }
    /**
     * Validate image entries format
     * @param imageEntries Array to validate
     * @returns true if valid
     * @throws {Error} When format is invalid
     */
    validateImageEntries(imageEntries) {
        if (!Array.isArray(imageEntries)) {
            throw new Error("Image entries must be an array");
        }
        if (imageEntries.length === 0) {
            throw new Error("No images found in manifest");
        }
        // Validate each entry has required fields
        for (const [photoId, imageData] of imageEntries) {
            if (!photoId) {
                throw new Error("Image entry missing photo ID");
            }
            if (!imageData || typeof imageData !== "object") {
                throw new Error(`Invalid image data for photo ID: ${photoId}`);
            }
        }
        return true;
    }
    /**
     * Get processed image entries with validation and limit applied
     * @returns Processed manifest data
     */
    async getProcessedImageEntries() {
        const { imageEntries, originalManifest, totalImages } = await this.loadManifest();
        if (totalImages === 0) {
            console.log(chalk.yellow("⚠️  No images found in manifest"));
            return {
                imageEntries: [],
                originalManifest,
                totalImages: 0,
            };
        }
        // Validate format
        this.validateImageEntries(imageEntries);
        // Apply limit if specified
        const limitedEntries = this.applyLimit(imageEntries);
        return {
            imageEntries: limitedEntries,
            originalManifest,
            totalImages: limitedEntries.length,
        };
    }
    /**
     * Create a local manifest with download results
     * @param results Download results
     * @param originalManifest Original manifest
     * @param stats Statistics provider
     * @returns Local manifest information
     */
    async createLocalManifest(results, originalManifest, stats) {
        console.log(chalk.blue("\n📝 Creating local manifest..."));
        const { localManifest, localManifestPath } = await this.fs.createLocalManifest(results, originalManifest, stats);
        console.log(chalk.blue(`   📄 Local manifest: ${this.fs.getRelativePath(localManifestPath, process.cwd())}`));
        return { localManifest, localManifestPath };
    }
    /**
     * Get image statistics from entries
     * @param imageEntries Array of image entries
     * @returns Image statistics
     */
    getImageStatistics(imageEntries) {
        if (imageEntries.length === 0) {
            return {
                total: 0,
                authors: [],
                uniqueAuthors: 0,
                averageWidth: 0,
                averageHeight: 0,
                imagesWithDimensions: 0,
            };
        }
        const authors = new Set();
        let totalWidth = 0;
        let totalHeight = 0;
        let validDimensionCount = 0;
        imageEntries.forEach(([, data]) => {
            if (data.image_author) {
                authors.add(data.image_author);
            }
            if (data.width && data.height) {
                totalWidth += data.width;
                totalHeight += data.height;
                validDimensionCount++;
            }
        });
        return {
            total: imageEntries.length,
            authors: Array.from(authors),
            uniqueAuthors: authors.size,
            averageWidth: validDimensionCount > 0
                ? Math.round(totalWidth / validDimensionCount)
                : 0,
            averageHeight: validDimensionCount > 0
                ? Math.round(totalHeight / validDimensionCount)
                : 0,
            imagesWithDimensions: validDimensionCount,
        };
    }
    /**
     * Display manifest statistics
     * @param imageEntries Array of image entries
     */
    displayManifestStats(imageEntries) {
        const stats = this.getImageStatistics(imageEntries);
        console.log(chalk.blue("📊 Manifest Statistics:"));
        console.log(chalk.gray(`   • Total images: ${stats.total}`));
        console.log(chalk.gray(`   • Unique authors: ${stats.uniqueAuthors}`));
        if (stats.imagesWithDimensions > 0) {
            console.log(chalk.gray(`   • Average dimensions: ${stats.averageWidth}×${stats.averageHeight}`));
            console.log(chalk.gray(`   • Images with dimensions: ${stats.imagesWithDimensions}`));
        }
    }
}
//# sourceMappingURL=ManifestService.js.map