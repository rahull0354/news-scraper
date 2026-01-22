/**
 * Pagination Handler Module
 *
 * Handles scraping multiple pages of news articles using Cheerio only.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * PaginationHandler Class
 * Automatically detects and handles pagination on news websites
 */
class PaginationHandler {
  constructor() {
    this.options = {
      maxPages: 5, // Maximum pages to scrape
      delayBetweenPages: 1000, // Delay in ms between page requests
      sameDomainOnly: true // Only follow pagination links on same domain
    };
  }

  /**
   * Scrape multiple pages from a paginated news site
   * @param {string} url - Starting URL
   * @param {object} scraper - NewsScraper instance
   * @param {object} options - Custom options
   * @returns {Promise<Array>} - Array of all articles from all pages
   */
  async scrapeMultiplePages(url, scraper, options = {}) {
    const opts = { ...this.options, ...options };
    const allArticles = [];
    const seenUrls = new Set();
    let currentPageUrl = url;
    let pageCount = 0;

    try {
      console.log('Starting multi-page scraping...');

      while (currentPageUrl && pageCount < opts.maxPages) {
        pageCount++;
        console.log(`\nScraping page ${pageCount}: ${currentPageUrl}`);

        try {
          // Scrape current page using Cheerio
          const pageArticles = await this.scrapePage(currentPageUrl, scraper);

          // Add new articles (avoiding duplicates)
          let newCount = 0;
          for (const article of pageArticles) {
            if (!seenUrls.has(article.url)) {
              seenUrls.add(article.url);
              allArticles.push(article);
              newCount++;
            }
          }

          console.log(`Found ${newCount} new articles on page ${pageCount}`);

          // Find next page link
          const nextPageUrl = await this.findNextPage(currentPageUrl);

          if (nextPageUrl && this.isValidPagination(currentPageUrl, nextPageUrl, opts)) {
            currentPageUrl = nextPageUrl;
            // Delay between requests to be polite
            await this.delay(opts.delayBetweenPages);
          } else {
            console.log('No more pages found or pagination limit reached');
            break;
          }

        } catch (error) {
          console.error(`Error scraping page ${pageCount}: ${error.message}`);
          break;
        }
      }

      console.log(`\nTotal: Scraped ${allArticles.length} articles from ${pageCount} page(s)`);
      return allArticles;

    } catch (error) {
      console.error(`Multi-page scraping failed: ${error.message}`);
      return allArticles;
    }
  }

  /**
   * Scrape a single page using the scraper
   * @param {string} url - Page URL
   * @param {object} scraper - NewsScraper instance
   * @returns {Promise<Array>} - Array of articles
   */
  async scrapePage(url, scraper) {
    try {
      const articles = await scraper.scrapeWithCheerio(url, scraper.options);
      return articles;
    } catch (error) {
      console.error(`Error scraping page: ${error.message}`);
      return [];
    }
  }

  /**
   * Find the next page link
   * @param {string} currentUrl - Current page URL
   * @returns {Promise<string|null>} - Next page URL or null
   */
  async findNextPage(currentUrl) {
    try {
      const response = await axios.get(currentUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      let nextPageUrl = null;

      // Try multiple strategies to find next page link

      // Strategy 1: Look for common pagination selectors
      const nextSelectors = [
        'a.next',
        'a[rel="next"]',
        '.pagination a.next',
        '.pagination .next',
        '[class*="pagination"] a[class*="next"]',
        '[class*="paging"] a[class*="next"]'
      ];

      for (const selector of nextSelectors) {
        const $link = $(selector);
        if ($link.length && $link.attr('href')) {
          const href = $link.attr('href');
          if (href && !href.includes('javascript:')) {
            try {
              nextPageUrl = new URL(href, currentUrl).href;
              break;
            } catch (e) {
              continue;
            }
          }
        }
      }

      // Strategy 2: Look for pagination with page numbers
      if (!nextPageUrl) {
        const currentPageNum = this.extractPageNumber(currentUrl);

        // Find all pagination links
        const pageLinks = [];
        $('[class*="pagination"] a, [class*="paging"] a').each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const text = $el.text().trim();

          if (href && !isNaN(text)) {
            try {
              pageLinks.push({
                url: new URL(href, currentUrl).href,
                page: parseInt(text)
              });
            } catch (e) {}
          }
        });

        // Find the next page number
        const sortedLinks = pageLinks
          .filter(l => l.page > currentPageNum)
          .sort((a, b) => a.page - b.page);

        if (sortedLinks.length > 0) {
          nextPageUrl = sortedLinks[0].url;
        }
      }

      // Strategy 3: Look for URL patterns (page/2/, ?page=2, etc.)
      if (!nextPageUrl) {
        const currentPageNum = this.extractPageNumber(currentUrl);
        const nextPageNum = currentPageNum + 1;

        // Try different pagination URL patterns
        const patterns = [
          currentUrl.replace(/\/page\/\d+/, `/page/${nextPageNum}`),
          currentUrl.replace(/\?page=\d+/, `?page=${nextPageNum}`),
          currentUrl.replace(/&page=\d+/, `&page=${nextPageNum}`),
          currentUrl.replace(/\/p\/\d+/, `/p/${nextPageNum}`),
          `${currentUrl.replace(/\/$/, '')}/page/${nextPageNum}`,
          `${currentUrl}?page=${nextPageNum}`
        ];

        for (const pattern of patterns) {
          if (pattern !== currentUrl) {
            nextPageUrl = pattern;
            break;
          }
        }
      }

      return nextPageUrl;

    } catch (error) {
      console.error(`Error finding next page: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract page number from URL
   * @param {string} url - URL to parse
   * @returns {number} - Page number (defaults to 1)
   */
  extractPageNumber(url) {
    // Try common patterns
    const patterns = [
      /\/page\/(\d+)/,
      /\?page=(\d+)/,
      /&page=(\d+)/,
      /\/p\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return 1;
  }

  /**
   * Validate that a URL is a valid pagination link
   * @param {string} currentUrl - Current page URL
   * @param {string} nextUrl - Next page candidate URL
   * @param {object} options - Options object
   * @returns {boolean} - True if valid pagination
   */
  isValidPagination(currentUrl, nextUrl, options) {
    try {
      const current = new URL(currentUrl);
      const next = new URL(nextUrl);

      // Check same domain if required
      if (options.sameDomainOnly && current.hostname !== next.hostname) {
        return false;
      }

      // Check if it's actually different
      if (currentUrl === nextUrl) {
        return false;
      }

      // Check if it looks like pagination
      const currentPath = current.pathname;
      const nextPath = next.pathname;

      // Should be on same base path
      const basePath = currentPath.replace(/\/page\/\d+/, '').replace(/\/p\/\d+/, '');

      return nextPath.startsWith(basePath) || nextPath.includes('page') || next.search.includes('page');

    } catch (error) {
      return false;
    }
  }

  /**
   * Delay helper function
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PaginationHandler;
