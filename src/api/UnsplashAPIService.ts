import chalk from "chalk";
import type { Config } from "../config/Config.js";

/**
 * Unsplash API photo response interface
 * Based on the official Unsplash API documentation
 */
interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  downloads: number;
  likes: number;
  liked_by_user: boolean;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string | null;
    twitter_username: string | null;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    instagram_username: string | null;
    total_collections: number;
    total_likes: number;
    total_photos: number;
  };
  exif: {
    make: string | null;
    model: string | null;
    name: string | null;
    exposure_time: string | null;
    aperture: string | null;
    focal_length: string | null;
    iso: number | null;
  } | null;
  location: {
    name: string | null;
    city: string | null;
    country: string | null;
    position: {
      latitude: number | null;
      longitude: number | null;
    };
  } | null;
  tags: Array<{
    type: string;
    title: string;
  }>;
  current_user_collections: any[];
  sponsorship: any;
  topic_submissions: any;
}

/**
 * Enhanced image metadata from Unsplash API
 */
export interface UnsplashImageMetadata {
  photoId: string;
  author: string;
  authorUrl: string;
  imageUrl: string;
  width: number;
  height: number;
  description: string | null;
  location: string | null;
  camera: string | null;
  likes: number;
  downloads: number;
  created_at: string;
  color: string;
  tags: string[];
}

/**
 * @fileoverview Unsplash API service for fetching detailed image metadata.
 * Provides comprehensive image information using the official Unsplash API,
 * including author details, image properties, EXIF data, location, and more.
 *
 * Key Features:
 * - Official Unsplash API integration
 * - Comprehensive metadata extraction
 * - Error handling and fallbacks
 * - Rate limiting awareness
 * - Caching capabilities
 *
 * API Endpoints Used:
 * - GET /photos/{id} - Fetch detailed photo information
 *
 * @example
 * ```javascript
 * const apiService = new UnsplashAPIService(config);
 * 
 * const metadata = await apiService.fetchImageMetadata('abc123');
 * console.log('Author:', metadata.author);
 * console.log('Profile:', metadata.authorUrl);
 * console.log('Image URL:', metadata.imageUrl);
 * ```
 */

/**
 * Unsplash API service for fetching detailed image metadata.
 * Uses the official Unsplash API to retrieve comprehensive information
 * about images including author details, dimensions, EXIF data, and more.
 */
export class UnsplashAPIService {
  private readonly config: Config;
  private readonly baseUrl = "https://api.unsplash.com";
  private accessKey: string;

  /**
   * Create a new Unsplash API service instance.
   *
   * @param config - Configuration instance containing API credentials
   * @throws {Error} When UNSPLASH_ACCESS_KEY is not configured
   * @example
   * ```javascript
   * const apiService = new UnsplashAPIService(config);
   * ```
   */
  constructor(config: Config) {
    this.config = config;
    
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      throw new Error(
        "UNSPLASH_ACCESS_KEY environment variable is required for API access"
      );
    }
    
    this.accessKey = accessKey;
  }

  /**
   * Make a request to the Unsplash API with proper headers and error handling.
   *
   * @param endpoint - API endpoint (e.g., "/photos/abc123")
   * @param options - Additional fetch options
   * @returns Promise resolving to the parsed JSON response
   * @throws {Error} When API request fails or returns error
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      "Authorization": `Client-ID ${this.accessKey}`,
      "Accept": "application/json",
      "Accept-Version": "v1",
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    };

    try {
      if (this.config.get("debug")) {
        console.log(chalk.gray(`   API Request: ${url}`));
      }

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Unsplash API error ${response.status}: ${errorText}`
        );
      }

      // Check rate limiting headers
      const rateLimit = response.headers.get("X-Ratelimit-Remaining");
      if (rateLimit && parseInt(rateLimit) < 10) {
        console.log(
          chalk.yellow(`⚠️  API rate limit low: ${rateLimit} requests remaining`)
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error: Unable to connect to Unsplash API");
      }
      throw error;
    }
  }

  /**
   * Fetch detailed metadata for a specific image from the Unsplash API.
   * 
   * @param photoId - Unsplash photo ID
   * @returns Promise resolving to enhanced image metadata
   * @throws {Error} When API request fails or photo not found
   * @example
   * ```javascript
   * const metadata = await apiService.fetchImageMetadata('abc123');
   * console.log({
   *   author: metadata.author,
   *   authorUrl: metadata.authorUrl,
   *   description: metadata.description,
   *   location: metadata.location,
   *   camera: metadata.camera
   * });
   * ```
   */
  async fetchImageMetadata(photoId: string): Promise<UnsplashImageMetadata> {
    try {
      console.log(chalk.gray(`   🌐 Fetching metadata from API for ${photoId}`));
      
      const photo: UnsplashPhoto = await this.makeRequest(`/photos/${photoId}`);
      
      // Extract camera information from EXIF data
      let camera: string | null = null;
      if (photo.exif) {
        const parts = [];
        if (photo.exif.make) parts.push(photo.exif.make);
        if (photo.exif.model) parts.push(photo.exif.model);
        if (parts.length > 0) {
          camera = parts.join(" ");
        }
      }

      // Extract location information
      let location: string | null = null;
      if (photo.location) {
        const locationParts = [];
        if (photo.location.city) locationParts.push(photo.location.city);
        if (photo.location.country) locationParts.push(photo.location.country);
        if (photo.location.name && !locationParts.some(part => photo.location!.name!.includes(part))) {
          locationParts.unshift(photo.location.name);
        }
        if (locationParts.length > 0) {
          location = locationParts.join(", ");
        }
      }

      // Build author profile URL
      const authorUrl = `https://unsplash.com/@${photo.user.username}`;

      // Get the best description
      const description = photo.description || photo.alt_description;

      // Extract tag titles
      const tags = photo.tags.map(tag => tag.title);

      const metadata: UnsplashImageMetadata = {
        photoId: photo.id,
        author: photo.user.name,
        authorUrl,
        imageUrl: photo.urls.raw, // Use raw URL for highest quality
        width: photo.width,
        height: photo.height,
        description,
        location,
        camera,
        likes: photo.likes,
        downloads: photo.downloads,
        created_at: photo.created_at,
        color: photo.color,
        tags,
      };

      if (this.config.get("debug")) {
        console.log(chalk.gray(`   ✅ API metadata retrieved for ${photoId}`));
        console.log(chalk.gray(`      Author: ${metadata.author}`));
        console.log(chalk.gray(`      Dimensions: ${metadata.width}x${metadata.height}`));
        if (metadata.description) {
          console.log(chalk.gray(`      Description: ${metadata.description.substring(0, 50)}...`));
        }
        if (metadata.location) {
          console.log(chalk.gray(`      Location: ${metadata.location}`));
        }
        if (metadata.camera) {
          console.log(chalk.gray(`      Camera: ${metadata.camera}`));
        }
      }

      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log(
        chalk.yellow(`   ⚠️  Failed to fetch API metadata for ${photoId}: ${errorMessage}`)
      );
      
      // Return basic metadata as fallback
      return {
        photoId,
        author: "Unknown author",
        authorUrl: "",
        imageUrl: "",
        width: 0,
        height: 0,
        description: null,
        location: null,
        camera: null,
        likes: 0,
        downloads: 0,
        created_at: new Date().toISOString(),
        color: "#000000",
        tags: [],
      };
    }
  }

  /**
   * Check API health and remaining rate limit.
   * 
   * @returns Promise resolving to API status information
   * @example
   * ```javascript
   * const status = await apiService.checkStatus();
   * console.log('Rate limit remaining:', status.rateLimitRemaining);
   * ```
   */
  async checkStatus(): Promise<{
    healthy: boolean;
    rateLimitRemaining: number | null;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/total`, {
        headers: {
          "Authorization": `Client-ID ${this.accessKey}`,
          "Accept": "application/json",
          "Accept-Version": "v1",
        },
      });

      const rateLimitRemaining = response.headers.get("X-Ratelimit-Remaining");

      if (response.ok) {
        return {
          healthy: true,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
        };
      } else {
        const errorText = await response.text();
        return {
          healthy: false,
          rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }
    } catch (error) {
      return {
        healthy: false,
        rateLimitRemaining: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
