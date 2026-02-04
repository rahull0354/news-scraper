import NewsScraper from './src/scraper.js';
import DataStorage from './src/storage.js';
import PaginationHandler from './src/pagination.js';
import NewsScheduler from './src/scheduler.js';
import readline from 'readline';
import chalk from 'chalk';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Show main menu
async function showMenu() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║             News Scraper              ║
║     A Beginner-Friendly Web Scraper   ║
╚═══════════════════════════════════════╝
  `));

  console.log(chalk.yellow('Select an option:\n'));
  console.log('1. Scrape a website (one-time)');
  console.log('2. Scrape with pagination');
  console.log('3. Schedule automated scraping');
  console.log('4. View examples');
  console.log('5. Exit\n');

  const choice = await question(chalk.green('Enter your choice (1-5): '));
  return choice;
}

// Option 1: Basic scraping
async function basicScraping() {
  console.log(chalk.cyan('\n--- Basic Scraping ---\n'));

  const url = await question(chalk.green('Enter website URL: '));

  if (!url || !url.startsWith('http')) {
    console.log(chalk.red('Invalid URL. Please enter a valid URL starting with http:// or https://'));
    return;
  }

  const formatChoice = await question(chalk.green('Output format (json/csv/both) [default: json]: ')) || 'json';
  const filename = await question(chalk.green('Output filename (press Enter to auto-generate): ')) || null;

  const scraper = new NewsScraper();
  const storage = new DataStorage();

  try {
    console.log(chalk.yellow('\nScraping...'));
    const articles = await scraper.scrapeNews(url);

    if (articles.length === 0) {
      console.log(chalk.yellow('\nNo articles found. The website structure might not match common patterns.'));
      return;
    }

    console.log(chalk.green(`Found ${articles.length} articles\n`));

    // Save in selected format
    if (formatChoice === 'csv') {
      await storage.saveToCsv(articles, filename);
    } else if (formatChoice === 'both') {
      await storage.saveToBoth(articles);
    } else {
      await storage.saveToJson(articles, filename);
    }

    // Show preview
    console.log(chalk.cyan('\n--- Article Preview ---\n'));
    articles.slice(0, 3).forEach((article, index) => {
      console.log(chalk.gray(`${index + 1}. ${article.title}`));
      console.log(chalk.gray(`   ${article.url}\n`));
    });

    if (articles.length > 3) {
      console.log(chalk.gray(`... and ${articles.length - 3} more articles\n`));
    }

  } catch (error) {
    console.log(chalk.red(`\nError: ${error.message}`));
    console.log(chalk.yellow('Tips:'));
    console.log(chalk.gray('  - Make sure the URL is correct'));
    console.log(chalk.gray('  - Some sites may block scraping (try a different site)'));
    console.log(chalk.gray('  - JavaScript-heavy sites may take longer\n'));
  }
}

// Option 2: Scraping with pagination
async function paginationScraping() {
  console.log(chalk.cyan('\n--- Scraping with Pagination ---\n'));

  const url = await question(chalk.green('Enter website URL: '));

  if (!url || !url.startsWith('http')) {
    console.log(chalk.red('Invalid URL. Please enter a valid URL starting with http:// or https://'));
    return;
  }

  const pagesInput = await question(chalk.green('Number of pages to scrape [default: 3]: ')) || '3';
  const maxPages = parseInt(pagesInput) || 3;

  const formatChoice = await question(chalk.green('Output format (json/csv/both) [default: json]: ')) || 'json';

  const scraper = new NewsScraper();
  const pagination = new PaginationHandler();
  const storage = new DataStorage();

  try {
    console.log(chalk.yellow(`\nScraping up to ${maxPages} pages...`));
    const articles = await pagination.scrapeMultiplePages(url, scraper, { maxPages });

    if (articles.length === 0) {
      console.log(chalk.yellow('\nNo articles found.'));
      return;
    }

    console.log(chalk.green(`Found ${articles.length} articles across multiple pages\n`));

    // Save in selected format
    if (formatChoice === 'csv') {
      await storage.saveToCsv(articles);
    } else if (formatChoice === 'both') {
      await storage.saveToBoth(articles);
    } else {
      await storage.saveToJson(articles);
    }

    // Show preview
    console.log(chalk.cyan('\n--- Article Preview ---\n'));
    articles.slice(0, 3).forEach((article, index) => {
      console.log(chalk.gray(`${index + 1}. ${article.title}`));
      console.log(chalk.gray(`   ${article.url}\n`));
    });

    if (articles.length > 3) {
      console.log(chalk.gray(`... and ${articles.length - 3} more articles\n`));
    }

  } catch (error) {
    console.log(chalk.red(`\nError: ${error.message}\n`));
  }
}

// Option 3: Schedule scraping
async function scheduleScraping() {
  console.log(chalk.cyan('\n--- Schedule Automated Scraping ---\n'));

  const url = await question(chalk.green('Enter website URL: '));

  if (!url || !url.startsWith('http')) {
    console.log(chalk.red('Invalid URL. Please enter a valid URL starting with http:// or https://'));
    return;
  }

  console.log(chalk.yellow('\nInterval options:'));
  console.log('  30s - 30 seconds');
  console.log('  15m - 15 minutes');
  console.log('  1h  - 1 hour');
  console.log('  1d  - 1 day\n');

  const interval = await question(chalk.green('Enter interval [e.g., 30m, 1h, 1d]: ')) || '1h';

  const pagesInput = await question(chalk.green('Number of pages to scrape [default: 1]: ')) || '1';
  const maxPages = parseInt(pagesInput) || 1;

  const formatChoice = await question(chalk.green('Output format (json/csv/both) [default: json]: ')) || 'json';

  const appendChoice = await question(chalk.green('Append to existing file? (y/n) [default: n]: ')) || 'n';
  const append = appendChoice.toLowerCase() === 'y';

  const scheduler = new NewsScheduler();

  try {
    const job = scheduler.scheduleScraping({
      url: url,
      interval: scheduler.parseInterval(interval),
      format: formatChoice,
      maxPages: maxPages,
      usePagination: maxPages > 1,
      append: append
    });

    console.log(chalk.green('\nScheduled scraping started!'));
    console.log(chalk.cyan(`\nJob ID: ${job.id}`));
    console.log(chalk.gray(`URL: ${url}`));
    console.log(chalk.gray(`Interval: ${job.intervalMinutes} minute(s)`));
    console.log(chalk.gray(`Next run: ${job.nextRun}\n`));
    console.log(chalk.yellow('Press Ctrl+C to stop the scheduler\n'));

    // Keep running
    await scheduler.keepAlive();

  } catch (error) {
    console.log(chalk.red(`\nError: ${error.message}\n`));
  }
}

// Option 4: View examples
async function viewExamples() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║             Usage Examples            ║
╚═══════════════════════════════════════╝

1. Scrape a news website:
   node index.js
   Select option 1
   Enter: https://example.com/news

2. Scrape multiple pages:
   node index.js
   Select option 2
   Enter: https://example.com/news
   Pages: 5

3. Schedule daily scraping:
   node index.js
   Select option 3
   Enter: https://example.com/news
   Interval: 1d

4. Using CLI directly:
   node src/cli.js scrape https://example.com/news -p 3 -f both
   node src/cli.js schedule https://example.com/news -i 1h

5. In your own code:
   import NewsScraper from './src/scraper.js';
   import DataStorage from './src/storage.js';

   const scraper = new NewsScraper();
   const storage = new DataStorage();
   const articles = await scraper.scrapeNews(url);
   await storage.saveToJson(articles);
  `));
}

// Main application loop
async function main() {
  let running = true;

  while (running) {
    const choice = await showMenu();

    switch (choice.trim()) {
      case '1':
        await basicScraping();
        break;
      case '2':
        await paginationScraping();
        break;
      case '3':
        await scheduleScraping();
        running = false; // Scheduler takes over
        break;
      case '4':
        await viewExamples();
        break;
      case '5':
        console.log(chalk.redBright('\nGoodbye!\n'));
        running = false;
        break;
      default:
        console.log(chalk.red('\nInvalid choice. Please enter 1-5\n'));
    }

    if (running) {
      const continueChoice = await question(chalk.green('\nPress Enter to continue...'));
      console.clear();
    }
  }

  rl.close();
}

// Run the application
main().catch((error) => {
  console.error(chalk.red(`Error: ${error.message}`));
  rl.close();
  process.exit(1);
});
