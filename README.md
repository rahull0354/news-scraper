# News Scraper

A beginner-friendly web scraper for extracting news articles from any website. Built with Node.js.

## Features

- **Universal Scraping**: Works with any news website URL - no need to find specific article components
- **Smart Detection**: Automatically finds articles using multiple strategies
- **Fast & Lightweight**: Uses Cheerio for efficient HTML parsing
- **Pagination**: Automatically scrapes multiple pages
- **Multiple Formats**: Save data as JSON, CSV, or both
- **Scheduler**: Set up automated scraping at regular intervals
- **Beginner Friendly**: Clear code with helpful comments

## Installation

1. Install Node.js from [nodejs.org](https://nodejs.org/) (version 16 or higher)

2. Install project dependencies:

```bash
npm install
```

## Quick Start

### Basic Scraping

Scrape articles from any news website:

```bash
npm run scrape https://example.com/news
```

Or using the CLI directly:

```bash
node src/cli.js scrape https://example.com/news
```

### Scrape Multiple Pages

```bash
node src/cli.js scrape https://example.com/news -p 5
```

This will scrape up to 5 pages automatically.

### Save as CSV

```bash
node src/cli.js scrape https://example.com/news -f csv
```

### Schedule Automated Scraping

Scrape every hour:

```bash
node src/cli.js schedule https://example.com/news -i 1h
```

Scrape every 30 minutes:

```bash
node src/cli.js schedule https://example.com/news -i 30m
```

Scrape daily:

```bash
node src/cli.js schedule https://example.com/news -i 1d
```

## Command Reference

### scrape - One-time Scraping

```bash
node src/cli.js scrape <url> [options]
```

**Options:**
- `-f, --format <format>` - Output format: `json`, `csv`, or `both` (default: json)
- `-o, --output <filename>` - Custom output filename (optional)
- `-p, --pages <number>` - Number of pages to scrape (default: 1)
- `--no-pagination` - Disable automatic pagination detection

**Examples:**

```bash
# Basic scraping
node src/cli.js scrape https://example.com/news

# Scrape 3 pages
node src/cli.js scrape https://example.com/news -p 3

# Save as CSV with custom filename
node src/cli.js scrape https://example.com/news -f csv -o mynews.csv

# Save as both JSON and CSV
node src/cli.js scrape https://example.com/news -f both
```

### schedule - Automated Scraping

```bash
node src/cli.js schedule <url> [options]
```

**Options:**
- `-i, --interval <interval>` - Interval: `30m`, `1h`, `1d` (default: 1h)
- `-f, --format <format>` - Output format: `json`, `csv`, or `both` (default: json)
- `-o, --output <filename>` - Custom output filename (optional)
- `-p, --pages <number>` - Number of pages to scrape (default: 1)
- `--append` - Append to existing file instead of creating new ones

**Interval Formats:**
- `30s` - 30 seconds
- `15m` - 15 minutes
- `2h` - 2 hours
- `1d` - 1 day

**Examples:**

```bash
# Scrape every hour
node src/cli.js schedule https://example.com/news -i 1h

# Scrape every 30 minutes and append to file
node src/cli.js schedule https://example.com/news -i 30m --append

# Daily scraping to custom file
node src/cli.js schedule https://example.com/news -i 1d -o daily-news.json
```

### jobs - List Scheduled Jobs

```bash
node src/cli.js jobs
```

Shows all currently scheduled scraping jobs with their details.

### cancel - Cancel a Job

```bash
node src/cli.js cancel <job-id>
```

Cancels a specific scheduled job using its ID.

### cancel-all - Cancel All Jobs

```bash
node src/cli.js cancel-all
```

Cancels all scheduled scraping jobs.

### examples - Show Usage Examples

```bash
node src/cli.js examples
```

Displays helpful usage examples.

## Output Format

### JSON Format

```json
{
  "scrapedAt": "2024-01-15T10:30:00.000Z",
  "totalArticles": 5,
  "articles": [
    {
      "title": "Article Title",
      "url": "https://example.com/article-1",
      "description": "Article description or excerpt...",
      "image": "https://example.com/image.jpg",
      "date": "2024-01-15",
      "author": "Author Name",
      "scrapedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### CSV Format

The CSV file contains the following columns:
- Title
- URL
- Description
- Image URL
- Date
- Author
- Scraped At

## Using in Your Own Code

You can also use the scraper in your own Node.js projects:

```javascript
import NewsScraper from './src/scraper.js';
import DataStorage from './src/storage.js';
import PaginationHandler from './src/pagination.js';
import NewsScheduler from './src/scheduler.js';

// Create instances
const scraper = new NewsScraper();
const storage = new DataStorage();

// Scrape articles
const articles = await scraper.scrapeNews('https://example.com/news');

// Save to JSON
await storage.saveToJson(articles);

// Or save to CSV
await storage.saveToCsv(articles);
```

### Advanced Usage

```javascript
// With pagination
const pagination = new PaginationHandler();
const articles = await pagination.scrapeMultiplePages(
  'https://example.com/news',
  scraper,
  { maxPages: 5 }
);

// Save with custom filename
await storage.saveToJson(articles, 'my-news.json');

// Append to existing file
await storage.appendToJson(articles, 'accumulated-news.json');
```

## How It Works

The scraper uses multiple strategies to find articles:

1. **Fast HTML Fetching**: Fetches HTML directly using Axios
2. **Smart Detection**: Tries multiple CSS selectors to find article elements
3. **Fallback**: If no articles found, extracts from news-like links

This approach ensures it works on most static news websites without customization.

## Project Structure

```
news-scraper/
├── index.js            # Interactive menu (easiest way to use)
├── src/
│   ├── scraper.js      # Core scraping functionality
│   ├── storage.js      # Data storage (JSON/CSV)
│   ├── pagination.js   # Pagination handling
│   ├── scheduler.js    # Automated scheduling
│   ├── cli.js          # Command-line interface
│   └── index.js        # Main entry point
├── output/             # Scraped data is saved here
├── package.json
└── README.md
```

## Tips for Beginners

1. **Start Simple**: Begin with basic scraping without pagination
2. **Check Output**: Look at the output folder to see results
3. **Use Examples**: Run `node src/cli.js examples` to see commands
4. **Be Patient**: Some websites take longer to load than others
5. **Respect Websites**: Don't scrape too frequently - use reasonable intervals

## Troubleshooting

### No articles found
- Try increasing the `--pages` option
- The site structure may not match common patterns
- Some sites with heavy JavaScript may not work (this scraper targets static sites)

### Scraping is slow
- Network delays are normal when scraping multiple pages
- Consider using longer intervals for scheduled scraping

### Too many duplicate articles
- This can happen with pagination
- The scraper automatically removes duplicates based on URL
- Check the output file to verify

## Error Handling

The scraper includes comprehensive error handling:

- Invalid URLs are detected before scraping
- Network timeouts are handled gracefully
- JavaScript errors don't crash the program
- Detailed error messages help identify issues

## Dependencies

- **axios**: For HTTP requests
- **cheerio**: For HTML parsing
- **commander**: For CLI interface
- **chalk**: For colored terminal output
- **csv-writer**: For CSV file creation

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
