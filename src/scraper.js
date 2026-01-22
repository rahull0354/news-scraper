import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * NewsScraper Class
 * Provides methods to scrape news articles from static websites using Cheerio
 */
class NewsScraper {
  constructor() {
    // Configuration options
    this.options = {
      timeout: 30000, // 30 seconds
      maxPages: 5, // Maximum pagination pages to scrape
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
  }

  /**
   * Main method to scrape news from a URL
   * @param {string} url - The website URL to scrape
   * @param {object} customOptions - Optional custom configuration
   * @returns {Promise<Array>} - Array of scraped news articles
   */
  async scrapeNews(url, customOptions = {}) {
    try {
      // Merge custom options with defaults
      const options = { ...this.options, ...customOptions };

      console.log(`Starting to scrape: ${url}`);

      // Scrape using Cheerio only
      const articles = await this.scrapeWithCheerio(url, options);

      console.log(`Successfully scraped ${articles.length} articles`);
      return articles;

    } catch (error) {
      throw new Error(`Scraping failed: ${error.message}`);
    }
  }

  /**
   * Scrape website using Cheerio only
   * @param {string} url - Website URL
   * @param {object} options - Scraping options
   * @returns {Promise<Array>} - Array of articles
   */
  async scrapeWithCheerio(url, options) {
    try {
      // Fetch the HTML content
      const response = await axios.get(url, {
        timeout: options.timeout,
        headers: {
          'User-Agent': options.userAgent
        }
      });

      // Load HTML into Cheerio
      const $ = cheerio.load(response.data);

      // Extract articles
      const articles = this.extractArticles($, url);
      return articles;

    } catch (error) {
      // If scraping fails, return empty array
      console.log(`Scraping failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Expose scrapeWithCheerio as tryStaticScraping for compatibility
   */
  async tryStaticScraping(url, options) {
    return this.scrapeWithCheerio(url, options);
  }

  extractArticles($, baseUrl) {
    const articles = [];
    const seenUrls = new Set(); // To avoid duplicates

    // Define multiple selectors that news sites commonly use
    const selectors = [
      // Article containers
      'article',
      '[class*="article"]',
      '[class*="news"]',
      '[class*="post"]',
      '[id*="article"]',
      '[id*="news"]',
      '[id*="post"]',

      // News item containers
      '.news-item',
      '.story',
      '.entry',
      '.card',
      '.item',

      // HTML5 article tags
      'article.article',
      'article.post',
      'article.story'
    ];

    // Try each selector
    for (const selector of selectors) {
      const elements = $(selector);

      elements.each((index, element) => {
        const $article = $(element);
        const article = this.parseArticle($article, $, baseUrl);

        // Only add valid articles with unique URLs
        if (article && article.title && article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          articles.push(article);
        }
      });

      // If we found articles, don't try more selectors
      if (articles.length > 0) {
        console.log(`Found articles using selector: ${selector}`);
        break;
      }
    }

    // If no articles found with container selectors, try link-based approach
    if (articles.length === 0) {
      const linkArticles = this.extractFromLinks($, baseUrl);
      articles.push(...linkArticles);
    }

    return articles;
  }
  
  parseArticle($article, $, baseUrl) {
    // Try to find title (multiple strategies)
    let title = '';
    const titleSelectors = [
      'h1', 'h2', 'h3', 'h4',
      '[class*="title"]',
      '[class*="headline"]',
      '.entry-title',
      'a[title]'
    ];

    for (const selector of titleSelectors) {
      const titleEl = $article.find(selector).first();
      if (titleEl.length) {
        title = titleEl.text().trim();
        if (title) break;
      }
    }

    // Try to find link
    let url = '';
    const linkSelectors = [
      'a[href]',
      '[href]',
      'link'
    ];

    for (const selector of linkSelectors) {
      const linkEl = $article.find(selector).first();
      if (linkEl.length) {
        url = linkEl.attr('href') || '';
        if (url) {
          // Resolve relative URLs
          try {
            url = new URL(url, baseUrl).href;
            break;
          } catch (e) {
            continue;
          }
        }
      }
    }

    // Try to find description/excerpt
    let description = '';
    const descSelectors = [
      'p',
      '[class*="excerpt"]',
      '[class*="summary"]',
      '[class*="description"]',
      '.entry-summary'
    ];

    for (const selector of descSelectors) {
      const descEl = $article.find(selector).first();
      if (descEl.length) {
        description = descEl.text().trim();
        if (description && description.length > 20) {
          description = description.substring(0, 500); // Limit length
          break;
        }
      }
    }

    // Try to find image
    let image = '';
    const imageEl = $article.find('img').first();
    if (imageEl.length) {
      image = imageEl.attr('src') || imageEl.attr('data-src') || '';
      if (image) {
        try {
          image = new URL(image, baseUrl).href;
        } catch (e) {
          image = '';
        }
      }
    }

    // Try to find date
    let date = '';
    const dateEl = $article.find('time').first()
      || $article.find('[datetime]').first()
      || $article.find('[class*="date"]').first();

    if (dateEl.length) {
      date = dateEl.attr('datetime') || dateEl.text().trim() || '';
    }

    // Try to find author
    let author = '';
    const authorEl = $article.find('[class*="author"]').first()
      || $article.find('[rel*="author"]').first();

    if (authorEl.length) {
      author = authorEl.text().trim() || '';
    }

    // Return article object if we have at least title and URL
    if (title && url && this.isValidUrl(url)) {
      return {
        title: this.cleanText(title),
        url: url,
        description: this.cleanText(description),
        image: image,
        date: date,
        author: author,
        scrapedAt: new Date().toISOString()
      };
    }

    return null;
  }

  extractFromLinks($, baseUrl) {
    const articles = [];

    // Look for links that might be articles
    $('a[href]').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();

      // Skip if not enough text or looks like navigation
      if (!text || text.length < 15 || text.length > 200) {
        return;
      }

      // Skip if it looks like navigation/footer
      const className = ($link.attr('class') || '').toLowerCase();
      const skipClasses = ['nav', 'menu', 'footer', 'header', 'sidebar', 'comment'];
      if (skipClasses.some(skip => className.includes(skip))) {
        return;
      }

      try {
        const url = new URL(href, baseUrl).href;

        if (this.isValidUrl(url) && this.looksLikeArticleUrl(url)) {
          articles.push({
            title: this.cleanText(text),
            url: url,
            description: '',
            image: '',
            date: '',
            author: '',
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Limit to avoid too many results
    return articles.slice(0, 50);
  }

  looksLikeArticleUrl(url) {
    const urlLower = url.toLowerCase();

    // Common patterns in article URLs
    const articlePatterns = [
      /\/news\//,
      /\/article\//,
      /\/story\//,
      /\/post\//,
      /\/\d{4}\/\d{2}\//, // Date pattern like /2024/01/
      /-article-/,
      /-news-/
    ];

    // Skip non-article pages
    const skipPatterns = [
      /\/category\//,
      /\/tag\//,
      /\/author\//,
      /\/page\//,
      /\.pdf$/,
      /\.jpg$/,
      /\.png$/,
      /\.gif$/
    ];

    // Check if it matches skip patterns
    if (skipPatterns.some(pattern => pattern.test(urlLower))) {
      return false;
    }

    // Check if it matches article patterns
    return articlePatterns.some(pattern => pattern.test(urlLower)) ||
           urlLower.split('/').length >= 4;
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  }
}

export default NewsScraper;
