import { Command } from 'commander';
import chalk from 'chalk';
import NewsScheduler from './scheduler.js';

const program = new Command();
const scheduler = new NewsScheduler();

const showBanner = () => {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║     News Scraper v1.0.0               ║
║     A Beginner-Friendly Web Scraper   ║
╚═══════════════════════════════════════╝
  `));
};

program
  .name('news-scraper')
  .description('Scrape news articles from any website')
  .version('1.0.0');

// Scrape command - one-time scraping
program
  .command('scrape')
  .description('Scrape news from a website')
  .argument('<url>', 'Website URL to scrape')
  .option('-f, --format <format>', 'Output format: json, csv, or both', 'json')
  .option('-o, --output <filename>', 'Output filename (optional)')
  .option('-p, --pages <number>', 'Number of pages to scrape (for pagination)', '1')
  .option('--no-pagination', 'Disable automatic pagination detection')
  .action(async (url, options) => {
    showBanner();

    try {
      const maxPages = parseInt(options.pages) || 1;
      const usePagination = options.pagination !== false && maxPages > 1;

      console.log(chalk.yellow('\n🔍 Starting scraping...\n'));
      console.log(chalk.gray(`URL: ${url}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      console.log(chalk.gray(`Pages: ${maxPages}`));
      console.log(chalk.gray(`Pagination: ${usePagination ? 'Enabled' : 'Disabled'}\n`));

      const result = await scheduler.runOnce({
        url: url,
        format: options.format,
        maxPages: maxPages,
        usePagination: usePagination,
        filename: options.output
      });

      if (result.success) {
        console.log(chalk.green(`\n✅ Success! Scraped ${result.count} article(s)`));

        if (result.filepath) {
          if (typeof result.filepath === 'object') {
            console.log(chalk.cyan(`\n📁 Files saved:`));
            console.log(chalk.gray(`   JSON: ${result.filepath.json}`));
            console.log(chalk.gray(`   CSV:  ${result.filepath.csv}`));
          } else {
            console.log(chalk.cyan(`\n📁 File saved: ${result.filepath}`));
          }
        }

        // Show preview of articles
        if (result.articles && result.articles.length > 0) {
          console.log(chalk.cyan(`\n📰 Article Preview:`));
          result.articles.slice(0, 3).forEach((article, index) => {
            console.log(chalk.gray(`\n   ${index + 1}. ${article.title}`));
            console.log(chalk.gray(`      ${article.url}`));
          });

          if (result.articles.length > 3) {
            console.log(chalk.gray(`\n   ... and ${result.articles.length - 3} more`));
          }
        }
      } else {
        console.log(chalk.red(`\n❌ Failed: ${result.error}`));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Schedule command - set up recurring scraping
program
  .command('schedule')
  .description('Schedule automatic scraping at regular intervals')
  .argument('<url>', 'Website URL to scrape')
  .option('-i, --interval <interval>', 'Interval (e.g., 30m, 2h, 1d)', '1h')
  .option('-f, --format <format>', 'Output format: json, csv, or both', 'json')
  .option('-o, --output <filename>', 'Output filename (optional)')
  .option('-p, --pages <number>', 'Number of pages to scrape', '1')
  .option('--append', 'Append to existing file instead of creating new one')
  .action(async (url, options) => {
    showBanner();

    try {
      const intervalMs = scheduler.parseInterval(options.interval);
      const maxPages = parseInt(options.pages) || 1;

      console.log(chalk.yellow('\n⏰ Setting up scheduled scraping...\n'));
      console.log(chalk.gray(`URL: ${url}`));
      console.log(chalk.gray(`Interval: ${options.interval}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      console.log(chalk.gray(`Pages: ${maxPages}`));
      console.log(chalk.gray(`Append: ${options.append ? 'Yes' : 'No'}\n`));

      const job = scheduler.scheduleScraping({
        url: url,
        interval: intervalMs,
        format: options.format,
        maxPages: maxPages,
        usePagination: maxPages > 1,
        filename: options.output,
        append: options.append
      });

      console.log(chalk.green(`\n✅ Job scheduled successfully!`));
      console.log(chalk.cyan(`\nJob ID: ${job.id}`));
      console.log(chalk.gray(`Use this ID to cancel the job later\n`));

      // Keep the scheduler running
      await scheduler.keepAlive();

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Jobs command - list scheduled jobs
program
  .command('jobs')
  .description('List all scheduled scraping jobs')
  .action(() => {
    showBanner();
    scheduler.listJobs();
  });

// Cancel command - cancel a scheduled job
program
  .command('cancel')
  .description('Cancel a scheduled scraping job')
  .argument('<jobId>', 'Job ID to cancel')
  .action((jobId) => {
    showBanner();

    if (scheduler.cancelJob(jobId)) {
      console.log(chalk.green('\n✅ Job cancelled successfully\n'));
    } else {
      console.log(chalk.red('\n❌ Job not found\n'));
      process.exit(1);
    }
  });

// Cancel-all command - cancel all jobs
program
  .command('cancel-all')
  .description('Cancel all scheduled scraping jobs')
  .action(() => {
    showBanner();
    scheduler.cancelAllJobs();
    console.log(chalk.green('\n✅ All jobs cancelled\n'));
  });

// Examples command - show usage examples
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    showBanner();
    console.log(chalk.cyan(`
📚 Usage Examples
─────────────────────────────────────────────

1️⃣  Basic Scraping:
   $ news-scraper scrape https://example.com/news

2️⃣  Scrape with Pagination (5 pages):
   $ news-scraper scrape https://example.com/news -p 5

3️⃣  Save as CSV:
   $ news-scraper scrape https://example.com/news -f csv

4️⃣  Save as Both JSON and CSV:
   $ news-scraper scrape https://example.com/news -f both

5️⃣  Schedule Hourly Scraping:
   $ news-scraper schedule https://example.com/news -i 1h

6️⃣  Schedule Daily Scraping:
   $ news-scraper schedule https://example.com/news -i 1d

7️⃣  Schedule with Custom Filename:
   $ news-scraper schedule https://example.com/news -i 30m -o mynews.json

8️⃣  Schedule and Append to Existing File:
   $ news-scraper schedule https://example.com/news -i 1h --append

9️⃣  List Scheduled Jobs:
   $ news-scraper jobs

🔟 Cancel a Job:
   $ news-scraper cancel <job-id>

─────────────────────────────────────────────
    `));
  });

program.parse();
