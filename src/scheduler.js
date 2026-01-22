import NewsScraper from './scraper.js';
import DataStorage from './storage.js';
import PaginationHandler from './pagination.js';

class NewsScheduler {
  constructor() {
    this.scraper = new NewsScraper();
    this.storage = new DataStorage();
    this.pagination = new PaginationHandler();
    this.scheduledJobs = new Map();
  }

  scheduleScraping(config) {
    const {
      url,
      interval = 3600000, // Default: every hour (in milliseconds)
      format = 'json', // 'json', 'csv', or 'both'
      maxPages = 1,
      usePagination = false,
      filename = null,
      append = false
    } = config;

    // Validate URL
    if (!url || !this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Create job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Define the scraping task
    const task = async () => {
      console.log(`\n[${new Date().toISOString()}] Running scheduled scraping task for: ${url}`);

      try {
        let articles;

        // Scrape with or without pagination
        if (usePagination && maxPages > 1) {
          articles = await this.pagination.scrapeMultiplePages(url, this.scraper, {
            maxPages: maxPages
          });
        } else {
          articles = await this.scraper.scrapeNews(url);
        }

        if (articles.length === 0) {
          console.log('No articles found');
          return;
        }

        // Save in specified format
        if (append) {
          await this.storage.appendToJson(articles, filename);
        } else if (format === 'csv') {
          await this.storage.saveToCsv(articles, filename);
        } else if (format === 'both') {
          await this.storage.saveToBoth(articles);
        } else {
          await this.storage.saveToJson(articles, filename);
        }

        console.log('Scheduled scraping completed successfully');

      } catch (error) {
        console.error(`Scheduled scraping failed: ${error.message}`);
      }
    };

    // Schedule the task
    const intervalId = setInterval(task, interval);

    // Store job info
    const job = {
      id: jobId,
      url: url,
      interval: interval,
      intervalMinutes: interval / 60000,
      format: format,
      maxPages: maxPages,
      usePagination: usePagination,
      intervalId: intervalId,
      createdAt: new Date().toISOString(),
      nextRun: new Date(Date.now() + interval).toISOString()
    };

    this.scheduledJobs.set(jobId, job);

    console.log(`\nScheduled scraping job created:`);
    console.log(`  Job ID: ${jobId}`);
    console.log(`  URL: ${url}`);
    console.log(`  Interval: ${job.intervalMinutes} minute(s)`);
    console.log(`  Format: ${format}`);
    console.log(`  Next run: ${job.nextRun}`);

    // Run immediately on first schedule
    task();

    return job;
  }

  cancelJob(jobId) {
    const job = this.scheduledJobs.get(jobId);

    if (!job) {
      console.log(`Job not found: ${jobId}`);
      return false;
    }

    clearInterval(job.intervalId);
    this.scheduledJobs.delete(jobId);

    console.log(`Cancelled job: ${jobId}`);
    return true;
  }

  cancelAllJobs() {
    this.scheduledJobs.forEach((job, jobId) => {
      clearInterval(job.intervalId);
    });

    const count = this.scheduledJobs.size;
    this.scheduledJobs.clear();

    console.log(`Cancelled ${count} scheduled job(s)`);
  }

  listJobs() {
    if (this.scheduledJobs.size === 0) {
      console.log('\nNo scheduled jobs');
      return;
    }

    console.log('\n=== Scheduled Jobs ===');
    this.scheduledJobs.forEach((job, jobId) => {
      console.log(`\nJob ID: ${jobId}`);
      console.log(`  URL: ${job.url}`);
      console.log(`  Interval: ${job.intervalMinutes} minute(s)`);
      console.log(`  Format: ${job.format}`);
      console.log(`  Max Pages: ${job.maxPages}`);
      console.log(`  Created: ${job.createdAt}`);
    });
  }

  async runOnce(config) {
    const {
      url,
      format = 'json',
      maxPages = 1,
      usePagination = false,
      filename = null
    } = config;

    console.log(`\nRunning one-time scraping task for: ${url}`);

    try {
      let articles;

      // Scrape with or without pagination
      if (usePagination && maxPages > 1) {
        articles = await this.pagination.scrapeMultiplePages(url, this.scraper, {
          maxPages: maxPages
        });
      } else {
        articles = await this.scraper.scrapeNews(url);
      }

      if (articles.length === 0) {
        console.log('No articles found');
        return { success: true, count: 0, articles: [] };
      }

      // Save in specified format
      let filepath;
      if (format === 'csv') {
        filepath = await this.storage.saveToCsv(articles, filename);
      } else if (format === 'both') {
        const paths = await this.storage.saveToBoth(articles);
        filepath = paths;
      } else {
        filepath = await this.storage.saveToJson(articles, filename);
      }

      console.log('Scraping completed successfully');

      return {
        success: true,
        count: articles.length,
        articles: articles,
        filepath: filepath
      };

    } catch (error) {
      console.error(`Scraping failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  parseInterval(interval) {
    if (typeof interval === 'number') {
      return interval;
    }

    // Parse human-readable format
    const match = interval.toString().match(/^(\d+)([smhd])?$/);

    if (!match) {
      throw new Error('Invalid interval format. Use: 30s, 15m, 2h, 1d, or milliseconds');
    }

    const value = parseInt(match[1]);
    const unit = match[2] || 's';

    const multipliers = {
      s: 1000,           // seconds
      m: 60000,          // minutes
      h: 3600000,        // hours
      d: 86400000        // days
    };

    return value * multipliers[unit];
  }

  keepAlive() {
    console.log('\nScheduler is running. Press Ctrl+C to stop.');
    console.log('Type "jobs" to list scheduled jobs\n');

    return new Promise(() => {
      // Keep the process alive
    });
  }
}

export default NewsScheduler;
