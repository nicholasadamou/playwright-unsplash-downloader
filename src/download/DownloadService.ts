import chalk from "chalk";
import path from "path";
import type { Download } from "playwright";
import type { Config } from "../config/Config.js";
import type { BrowserManager } from "../browser/BrowserManager.js";
import type { FileSystemService } from "../fs/FileSystemService.js";
import type { StatsTracker } from "../stats/StatsTracker.js";
import { UnsplashAPIService } from "../api/UnsplashAPIService.js";
import type {
  ImageData,
  DownloadResult,
  SizeSelection,
  ImageEntry,
  ImageSize,
} from "../types";
/**
 * Download service for handling image download logic, retry mechanism, and size validation.
 * Follows the Single Responsibility Principle by handling only download-related operations.
 * Coordinates with browser, filesystem, and stats services to provide complete download functionality.
 */
export class DownloadService {
  private readonly config: Config;
  private readonly browser: BrowserManager;
  private readonly fs: FileSystemService;
  private readonly stats: StatsTracker;
  private readonly apiService: UnsplashAPIService;

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
  constructor(
    config: Config,
    browserManager: BrowserManager,
    fileSystemService: FileSystemService,
    statsTracker: StatsTracker
  ) {
    this.config = config;
    this.browser = browserManager;
    this.fs = fileSystemService;
    this.stats = statsTracker;
    this.apiService = new UnsplashAPIService(config);
  }

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
  async validateAndSelectSize(
    photoId: string,
    imageData: ImageData,
    preferredSize: string
  ): Promise<SizeSelection> {
    const sizeMap = this.config.getSizeMap();

    // Define size preference order (fallback chain)
    const sizeOrder: ImageSize[] = ["original", "large", "medium", "small"];
    const preferredIndex = sizeOrder.indexOf(preferredSize as ImageSize);

    // If the preferred size is not in our standard list, default to original
    if (preferredIndex === -1) {
      console.log(
        chalk.yellow(
          `   ⚠️  Unknown size '${preferredSize}', defaulting to original`
        )
      );
      return { selectedSize: "original", selectedWidth: null };
    }

    const validPreferredSize = preferredSize as ImageSize;

    // Check if we have image dimension data to validate against
    const hasImageDimensions = imageData.width && imageData.height;

    if (!hasImageDimensions) {
      // Without dimension data, we can't validate sizes, so use preferred or default
      console.log(
        chalk.gray(
          `   📏 No dimension data available, using ${preferredSize} size`
        )
      );
      return {
        selectedSize: validPreferredSize,
        selectedWidth: sizeMap[validPreferredSize],
      };
    }

    // Validate that the requested width doesn't exceed the original image width
    const originalWidth = imageData.width;
    if (originalWidth === undefined) {
      throw new Error("Image width is undefined");
    }

    const requestedWidth = sizeMap[validPreferredSize];

    // If requesting original or if no width constraint, use as-is
    if (!requestedWidth || requestedWidth >= originalWidth) {
      if (requestedWidth && requestedWidth > originalWidth) {
        console.log(
          chalk.yellow(
            `   📏 Requested ${preferredSize} size (${requestedWidth}px) larger than original (${originalWidth}px), using original`
          )
        );
        return { selectedSize: "original", selectedWidth: null };
      }
      return {
        selectedSize: validPreferredSize,
        selectedWidth: requestedWidth,
      };
    }

    // If the preferred size is valid, use it
    if (requestedWidth <= originalWidth) {
      return {
        selectedSize: validPreferredSize,
        selectedWidth: requestedWidth,
      };
    }

    // Preferred size is too large, find the best alternative
    console.log(
      chalk.yellow(
        `   📏 Preferred ${preferredSize} size (${requestedWidth}px) not available for ${photoId} (original: ${originalWidth}px)`
      )
    );

    // Look for the largest size that fits
    for (let i = preferredIndex + 1; i < sizeOrder.length; i++) {
      const alternativeSize = sizeOrder[i];
      if (!alternativeSize) {
        continue;
      }
      const alternativeWidth = sizeMap[alternativeSize];

      if (!alternativeWidth || alternativeWidth <= originalWidth) {
        console.log(
          chalk.gray(
            `   📏 Falling back to ${alternativeSize} size${alternativeWidth ? ` (${alternativeWidth}px)` : ""}`
          )
        );
        return {
          selectedSize: alternativeSize,
          selectedWidth: alternativeWidth,
        };
      }
    }

    // If no size in the fallback chain works, use original
    console.log(
      chalk.gray(
        `   📏 No suitable size found in fallback chain, using original`
      )
    );
    return { selectedSize: "original", selectedWidth: null };
  }

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
  async extractIxid(photoId: string): Promise<string> {
    const page = await this.browser.getPage();

    // First navigate to the photo page to get the ixid
    const photoUrl = `https://unsplash.com/photos/${photoId}`;
    await page.goto(photoUrl, { waitUntil: "domcontentloaded" });

    let ixid = null;

    // Try to find ixid from download buttons or links
    const downloadLinks = await page
      .locator('a[href*="download"][href*="ixid"]')
      .all();

    for (const link of downloadLinks) {
      try {
        const href = await link.getAttribute("href");
        if (href && href.includes("ixid=")) {
          const match = href.match(/ixid=([^&]+)/);
          if (match) {
            ixid = match[1];
            console.log(chalk.gray(`   Found ixid: ${ixid}`));
            break;
          }
        }
      } catch (e) {
        // Continue to the next link if this one fails
      }
    }

    // If we couldn't find ixid from download links, try to extract from page source
    if (!ixid) {
      try {
        const pageContent = await page.content();
        const ixidMatch = pageContent.match(/ixid=([A-Za-z0-9+\/=]+)/);
        if (ixidMatch) {
          ixid = ixidMatch[1];
          console.log(chalk.gray(`   Extracted ixid from page: ${ixid}`));
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.log(
          chalk.yellow(
            `   Could not extract ixid from page content: ${errorMessage}`
          )
        );
      }
    }

    if (!ixid) {
      throw new Error("Could not find ixid parameter required for download");
    }

    return ixid;
  }

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
  async downloadImageDirect(
    photoId: string,
    imageData: ImageData
  ): Promise<Download> {
    try {
      console.log(chalk.gray(`   Trying direct download URL for ${photoId}`));

      const ixid = await this.extractIxid(photoId);

      // Validate preferred size and implement fallback strategy
      const preferredSize = this.config.get("preferredSize");
      if (!preferredSize) {
        throw new Error("Preferred size not configured");
      }

      const { selectedSize, selectedWidth } = await this.validateAndSelectSize(
        photoId,
        imageData,
        preferredSize.toLowerCase()
      );

      // Construct direct download URL with ixid and optional width
      let downloadUrl = `https://unsplash.com/photos/${photoId}/download?ixid=${ixid}&force=true`;

      if (selectedWidth) {
        downloadUrl += `&w=${selectedWidth}`;
        console.log(
          chalk.gray(`   Using ${selectedSize} size (w=${selectedWidth})`)
        );
      } else {
        console.log(
          chalk.gray(`   Using ${selectedSize} size (no width limit)`)
        );
      }

      console.log(
        chalk.gray(`   Looking for download button with URL: ${downloadUrl}`)
      );

      const page = await this.browser.getPage();

      // Find the button/link that has the download URL
      const downloadButton = page
        .locator(`a[href="${downloadUrl}"], a[href*="${ixid}"]`)
        .first();

      // Check if the button exists
      const buttonExists = await downloadButton.isVisible({ timeout: 5000 });
      if (!buttonExists) {
        console.log(
          chalk.yellow(
            `   Download button not found, trying partial URL match...`
          )
        );
        // Try to find any download link with the ixid
        const anyDownloadButton = page
          .locator(`a[href*="download"][href*="${ixid}"]`)
          .first();
        const anyButtonExists = await anyDownloadButton.isVisible({
          timeout: 3000,
        });

        if (!anyButtonExists) {
          throw new Error("Could not find download button on page");
        }

        console.log(
          chalk.gray(`   Found download button with partial URL match`)
        );

        // Set up the download promise before clicking
        const timeout = this.config.get("timeout");
        if (timeout === undefined) {
          throw new Error("Timeout not configured");
        }
        const downloadPromise = this.browser.waitForDownload(timeout);

        // Click the download button
        console.log(chalk.gray(`   Clicking download button...`));
        await anyDownloadButton.click();

        // Wait for download to start
        return await downloadPromise;
      }

      console.log(chalk.gray(`   Found download button, clicking it...`));

      // Set up the download promise before clicking
      const timeout = this.config.get("timeout");
      if (timeout === undefined) {
        throw new Error("Timeout not configured");
      }
      const downloadPromise = this.browser.waitForDownload(timeout);

      // Click the download button
      await downloadButton.click();

      // Wait for download to start
      return await downloadPromise;
    } catch (error) {
      // Re-throw the error to be handled by the calling method
      throw error;
    }
  }

  /**
   * Enhance download result with additional metadata from the Unsplash API.
   * Fetches comprehensive image metadata including author information,
   * image properties, EXIF data, location, and more.
   *
   * @param result - Basic download result to enhance
   * @returns Enhanced download result with API metadata
   * @example
   * ```javascript
   * const enhancedResult = await downloadService.enhanceWithApiMetadata(basicResult);
   * console.log('Author URL:', enhancedResult.authorUrl);
   * console.log('Location:', enhancedResult.location);
   * ```
   */
  async enhanceWithApiMetadata(result: DownloadResult): Promise<DownloadResult> {
    if (!result.success) {
      return result;
    }

    try {
      // Fetch enhanced metadata from Unsplash API
      const apiMetadata = await this.apiService.fetchImageMetadata(result.photoId);

      // Enhance the result with API metadata
      const enhancedResult: DownloadResult = {
        ...result,
        author: apiMetadata.author,
        authorUrl: apiMetadata.authorUrl,
        imageUrl: apiMetadata.imageUrl,
        width: apiMetadata.width,
        height: apiMetadata.height,
        likes: apiMetadata.likes,
      };

      // Add optional fields only if they have values
      if (apiMetadata.description) {
        enhancedResult.description = apiMetadata.description;
      }
      if (apiMetadata.location) {
        enhancedResult.location = apiMetadata.location;
      }
      if (apiMetadata.camera) {
        enhancedResult.camera = apiMetadata.camera;
      }

      return enhancedResult;
    } catch (error) {
      console.log(
        chalk.yellow(`   ⚠️  Could not enhance with API metadata: ${(error as Error).message}`)
      );
      return result;
    }
  }

  /**
   * Download a single image using a specific browser context for concurrent operations.
   * This method is similar to downloadImage but uses a provided context for parallel processing.
   *
   * @param photoId - Unsplash photo ID to download
   * @param imageData - Image metadata including dimensions and author
   * @param context - Browser context to use for this download
   * @param attempt - Current retry attempt number
   * @returns Complete download result with status and metadata
   */
  async downloadImageConcurrent(
    photoId: string,
    imageData: ImageData,
    context: any,
    attempt: number = 1
  ): Promise<DownloadResult> {
    try {
      const retries = this.config.get("retries");
      if (retries === undefined) {
        throw new Error("Retries not configured");
      }

      console.log(
        chalk.blue(`📥 [${attempt}/${retries}] Downloading (concurrent): ${photoId}`)
      );

      // In dry-run mode, simulate success without actually downloading
      if (this.config.get("dryRun")) {
        console.log(chalk.gray(`   [DRY RUN] Would download from direct URL`));
        this.stats.incrementDownloaded();

        const downloadDir = this.config.get("downloadDir");
        if (!downloadDir) {
          throw new Error("Download directory not configured");
        }

        // Create basic result with proper author information
        let result: DownloadResult = {
          success: true,
          photoId,
          filepath: path.join(downloadDir, `${photoId}.jpg`),
          filename: `${photoId}.jpg`,
          size: 1024 * 1024, // Simulate 1MB file
          author: (imageData.image_author as string) || "Unknown author",
          authorUrl: imageData.image_author_url as string,
          width: imageData.width as number,
          height: imageData.height as number,
          description: imageData.description as string,
          dryRun: true,
        };

        // Enhance with API metadata
        result = await this.enhanceWithApiMetadata(result);
        return result;
      }

      // Use concurrent download approach
      const download = await this.downloadImageDirectConcurrent(photoId, imageData, context);

      console.log(
        chalk.gray(`   ✅ Direct download URL worked for ${photoId} (concurrent)`)
      );

      // Save the download using file system service
      const fileInfo = await this.fs.saveDownload(download, photoId);

      console.log(
        chalk.green(
          `✅ Downloaded: ${fileInfo.filename} (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)`
        )
      );

      this.stats.incrementDownloaded();

      // Create basic result with proper author information
      let result: DownloadResult = {
        success: true,
        photoId,
        filepath: fileInfo.filepath,
        filename: fileInfo.filename,
        size: fileInfo.size,
        author: (imageData.image_author as string) || "Unknown author",
        authorUrl: imageData.image_author_url as string,
        width: imageData.width as number,
        height: imageData.height as number,
        description: imageData.description as string,
      };

      // Enhance with API metadata
      result = await this.enhanceWithApiMetadata(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        chalk.red(`❌ Error downloading ${photoId} (concurrent):`, errorMessage)
      );

      const retries = this.config.get("retries");
      if (retries && attempt < retries) {
        console.log(
          chalk.yellow(
            `🔄 Retrying ${photoId} (attempt ${attempt + 1}/${retries})`
          )
        );
        await this.exponentialBackoff(attempt);
        return this.downloadImageConcurrent(photoId, imageData, context, attempt + 1);
      }

      this.stats.incrementFailed();
      return {
        success: false,
        photoId,
        error: errorMessage,
      };
    }
  }

  /**
   * Download image using direct URL approach with a specific context.
   *
   * @param photoId - Unsplash photo ID to download
   * @param imageData - Image metadata including dimensions and author
   * @param context - Browser context to use
   * @returns Playwright download object
   */
  async downloadImageDirectConcurrent(
    photoId: string,
    imageData: ImageData,
    context: any
  ): Promise<any> {
    try {
      console.log(chalk.gray(`   Trying direct download URL for ${photoId} (concurrent)`));

      // Create a page in the provided context
      const page = await this.browser.createPageInContext(context);

      try {
        const ixid = await this.extractIxidConcurrent(photoId, page);

        // Validate preferred size and implement fallback strategy
        const preferredSize = this.config.get("preferredSize");
        if (!preferredSize) {
          throw new Error("Preferred size not configured");
        }

        const { selectedSize, selectedWidth } = await this.validateAndSelectSize(
          photoId,
          imageData,
          preferredSize.toLowerCase()
        );

        // Construct direct download URL with ixid and optional width
        let downloadUrl = `https://unsplash.com/photos/${photoId}/download?ixid=${ixid}&force=true`;

        if (selectedWidth) {
          downloadUrl += `&w=${selectedWidth}`;
          console.log(
            chalk.gray(`   Using ${selectedSize} size (w=${selectedWidth}) (concurrent)`)
          );
        } else {
          console.log(
            chalk.gray(`   Using ${selectedSize} size (no width limit) (concurrent)`)
          );
        }

        // Find the button/link that has the download URL
        const downloadButton = page
          .locator(`a[href="${downloadUrl}"], a[href*="${ixid}"]`)
          .first();

        // Check if the button exists
        const buttonExists = await downloadButton.isVisible({ timeout: 5000 });
        if (!buttonExists) {
          // Try to find any download link with the ixid
          const anyDownloadButton = page
            .locator(`a[href*="download"][href*="${ixid}"]`)
            .first();
          const anyButtonExists = await anyDownloadButton.isVisible({
            timeout: 3000,
          });

          if (!anyButtonExists) {
            throw new Error("Could not find download button on page");
          }

          // Set up the download promise before clicking
          const timeout = this.config.get("timeout");
          if (timeout === undefined) {
            throw new Error("Timeout not configured");
          }
          const downloadPromise = this.browser.waitForDownloadInPage(page, timeout);

          // Click the download button
          await anyDownloadButton.click();
          return await downloadPromise;
        }

        // Set up the download promise before clicking
        const timeout = this.config.get("timeout");
        if (timeout === undefined) {
          throw new Error("Timeout not configured");
        }
        const downloadPromise = this.browser.waitForDownloadInPage(page, timeout);

        // Click the download button
        await downloadButton.click();
        return await downloadPromise;
      } finally {
        // Clean up the page
        await page.close();
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract ixid parameter using a specific page for concurrent operations.
   *
   * @param photoId - Unsplash photo ID to extract ixid for
   * @param page - Page instance to use
   * @returns The extracted ixid parameter
   */
  async extractIxidConcurrent(photoId: string, page: any): Promise<string> {
    const photoUrl = `https://unsplash.com/photos/${photoId}`;
    await page.goto(photoUrl, { waitUntil: "domcontentloaded" });

    let ixid = null;

    // Try to find ixid from download buttons or links
    const downloadLinks = await page
      .locator('a[href*="download"][href*="ixid"]')
      .all();

    for (const link of downloadLinks) {
      try {
        const href = await link.getAttribute("href");
        if (href && href.includes("ixid=")) {
          const match = href.match(/ixid=([^&]+)/);
          if (match) {
            ixid = match[1];
            break;
          }
        }
      } catch (e) {
        // Continue to the next link if this one fails
      }
    }

    // If we couldn't find ixid from download links, try to extract from page source
    if (!ixid) {
      try {
        const pageContent = await page.content();
        const ixidMatch = pageContent.match(/ixid=([A-Za-z0-9+\/=]+)/);
        if (ixidMatch) {
          ixid = ixidMatch[1];
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.log(
          chalk.yellow(
            `   Could not extract ixid from page content: ${errorMessage}`
          )
        );
      }
    }

    if (!ixid) {
      throw new Error("Could not find ixid parameter required for download");
    }

    return ixid;
  }

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
  async downloadImage(
    photoId: string,
    imageData: ImageData,
    attempt: number = 1
  ): Promise<DownloadResult> {
    try {
      const retries = this.config.get("retries");
      if (retries === undefined) {
        throw new Error("Retries not configured");
      }

      console.log(
        chalk.blue(`📥 [${attempt}/${retries}] Downloading: ${photoId}`)
      );

      // In dry-run mode, simulate success without actually downloading
      if (this.config.get("dryRun")) {
        console.log(chalk.gray(`   [DRY RUN] Would download from direct URL`));
        this.stats.incrementDownloaded();

        const downloadDir = this.config.get("downloadDir");
        if (!downloadDir) {
          throw new Error("Download directory not configured");
        }

        // Create basic result with proper author information
        let result: DownloadResult = {
          success: true,
          photoId,
          filepath: path.join(downloadDir, `${photoId}.jpg`),
          filename: `${photoId}.jpg`,
          size: 1024 * 1024, // Simulate 1MB file
          author: (imageData.image_author as string) || "Unknown author",
          authorUrl: imageData.image_author_url as string,
          width: imageData.width as number,
          height: imageData.height as number,
          description: imageData.description as string,
          dryRun: true,
        };

        // Enhance with API metadata
        result = await this.enhanceWithApiMetadata(result);
        return result;
      }

      // Use direct download URL approach only
      const download = await this.downloadImageDirect(photoId, imageData);

      console.log(
        chalk.gray(`   ✅ Direct download URL worked for ${photoId}`)
      );

      // Save the download using file system service
      const fileInfo = await this.fs.saveDownload(download, photoId);

      console.log(
        chalk.green(
          `✅ Downloaded: ${fileInfo.filename} (${(fileInfo.size / 1024 / 1024).toFixed(2)} MB)`
        )
      );

      this.stats.incrementDownloaded();

      // Create basic result with proper author information
      let result: DownloadResult = {
        success: true,
        photoId,
        filepath: fileInfo.filepath,
        filename: fileInfo.filename,
        size: fileInfo.size,
        author: (imageData.image_author as string) || "Unknown author",
        authorUrl: imageData.image_author_url as string,
        width: imageData.width as number,
        height: imageData.height as number,
        description: imageData.description as string,
      };

      // Enhance with API metadata
      result = await this.enhanceWithApiMetadata(result);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        chalk.red(`❌ Error downloading ${photoId}:`, errorMessage)
      );

      // Take debug screenshot if enabled
      await this.takeDebugScreenshot(photoId, attempt);

      const retries = this.config.get("retries");
      if (retries && attempt < retries) {
        console.log(
          chalk.yellow(
            `🔄 Retrying ${photoId} (attempt ${attempt + 1}/${retries})`
          )
        );
        await this.exponentialBackoff(attempt);
        return this.downloadImage(photoId, imageData, attempt + 1);
      }

      this.stats.incrementFailed();
      return {
        success: false,
        photoId,
        error: errorMessage,
      };
    }
  }

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
  async takeDebugScreenshot(photoId: string, attempt: number): Promise<void> {
    if (!this.config.get("debug")) {
      return;
    }

    try {
      const screenshotPath = this.fs.getDebugScreenshotPath(photoId, attempt);
      const savedPath = await this.browser.takeDebugScreenshot(screenshotPath);

      if (savedPath) {
        console.log(chalk.gray(`   Debug screenshot saved: ${savedPath}`));
      }
    } catch (screenshotError) {
      console.log(
        chalk.gray(
          `   Could not save debug screenshot: ${(screenshotError as Error).message}`
        )
      );
    }
  }

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
  async exponentialBackoff(attempt: number): Promise<void> {
    const delay = 2000 * attempt; // 2s, 4s, 6s, etc.
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

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
  async downloadImages(imageEntries: ImageEntry[]): Promise<DownloadResult[]> {
    console.log(
      chalk.blue(`📦 Processing ${imageEntries.length} images sequentially`)
    );

    const results: DownloadResult[] = [];

    // Process images one by one
    for (const [photoId, imageData] of imageEntries) {
      // Check if image already exists
      const existsCheck = await this.fs.imageExists(photoId);
      if (existsCheck.exists) {
        console.log(chalk.gray(`⏭️  Skipped (exists): ${photoId}`));
        this.stats.incrementSkipped();
        results.push({
          success: true,
          photoId,
          skipped: true,
          filepath: existsCheck.filepath || "",
          size: existsCheck.size || 0,
          author: (imageData.image_author as string) || "Unknown author",
          authorUrl: imageData.image_author_url as string,
          width: imageData.width as number,
          height: imageData.height as number,
          description: imageData.description as string,
        });
        continue;
      }

      const result = await this.downloadImage(photoId, imageData);
      results.push(result);

      // Small delay between downloads to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Process images concurrently with configurable worker pool.
   * Downloads multiple images in parallel using separate browser contexts,
   * respects rate limits, and maintains authentication across contexts.
   *
   * @param imageEntries - Array of [photoId, imageData] tuples
   * @returns Array of download results
   */
  async downloadImagesConcurrent(imageEntries: ImageEntry[]): Promise<DownloadResult[]> {
    const concurrency = this.config.get("concurrency") || 3;

    console.log(
      chalk.blue(`📦 Processing ${imageEntries.length} images with ${concurrency} concurrent workers`)
    );

    // Initialize context pool for concurrent operations
    await this.browser.initializeContextPool(concurrency);

    const results: DownloadResult[] = [];
    const workerPromises: Promise<void>[] = [];
    let currentIndex = 0;

    // Create worker functions
    const createWorker = async (workerId: number): Promise<void> => {
      while (currentIndex < imageEntries.length) {
        const entryIndex = currentIndex++;
        if (entryIndex >= imageEntries.length) break;
        
        const entry = imageEntries[entryIndex];
        if (!entry) continue; // Skip if entry is undefined
        
        const [photoId, imageData] = entry;

        try {
          // Check if image already exists
          const existsCheck = await this.fs.imageExists(photoId);
          if (existsCheck.exists) {
            console.log(chalk.gray(`⏭️  Worker ${workerId}: Skipped (exists): ${photoId}`));
            this.stats.incrementSkipped();
            results[entryIndex] = {
              success: true,
              photoId,
              skipped: true,
              filepath: existsCheck.filepath || "",
              size: existsCheck.size || 0,
              author: (imageData.image_author as string) || "Unknown author",
              authorUrl: imageData.image_author_url as string,
              width: imageData.width as number,
              height: imageData.height as number,
              description: imageData.description as string,
            };
            continue;
          }

          // Acquire a context for this download
          const context = await this.browser.acquireContext();

          try {
            // Download the image using the acquired context
            const result = await this.downloadImageConcurrent(photoId, imageData, context);
            results[entryIndex] = result;

            // Small delay to be respectful to the server
            await new Promise((resolve) => setTimeout(resolve, 500));
          } finally {
            // Always release the context back to the pool
            this.browser.releaseContext(context);
          }
        } catch (error) {
          console.error(
            chalk.red(`Worker ${workerId} error processing ${photoId}:`, (error as Error).message)
          );
          results[entryIndex] = {
            success: false,
            photoId,
            error: (error as Error).message,
          };
        }
      }
    };

    // Start all workers
    for (let i = 0; i < concurrency; i++) {
      workerPromises.push(createWorker(i));
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises);

    // Filter out any undefined results (shouldn't happen, but safety check)
    return results.filter(result => result !== undefined);
  }

  /**
   * Download images with progress tracking and timing statistics.
   * Automatically chooses between concurrent and sequential processing based on configuration.
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
  async downloadImagesWithProgress(
    imageEntries: ImageEntry[]
  ): Promise<DownloadResult[]> {
    console.log(chalk.blue("\n🚀 Starting downloads...\n"));

    const enableConcurrency = this.config.get("enableConcurrency");
    const concurrency = this.config.get("concurrency") || 3;

    if (enableConcurrency && imageEntries.length > 1) {
      console.log(
        chalk.green(`⚡ Concurrent mode enabled with ${concurrency} workers`)
      );
    } else {
      console.log(
        chalk.blue("📋 Sequential mode (concurrency disabled or single image)")
      );
    }

    this.stats.startTiming();

    let results: DownloadResult[];
    if (enableConcurrency && imageEntries.length > 1) {
      results = await this.downloadImagesConcurrent(imageEntries);
    } else {
      results = await this.downloadImages(imageEntries);
    }

    this.stats.endTiming();

    return results;
  }

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
  } {
    const successful = results.filter((r) => r.success && !r.skipped);
    const failed = results.filter((r) => !r.success);
    const skipped = results.filter((r) => r.skipped);
    const totalStorage = this.fs.calculateTotalStorage(results);

    return {
      successful: successful.length,
      failed: failed.length,
      skipped: skipped.length,
      totalStorage,
      failedResults: failed,
    };
  }
}
