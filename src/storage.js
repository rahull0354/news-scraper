import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

class DataStorage {
  constructor() {
    // Output directory for saved files
    this.outputDir = 'output';
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`Created output directory: ${this.outputDir}`);
    }
  }

  async saveToJson(articles, filename = null) {
    await this.ensureOutputDir();

    // Generate filename if not provided
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      filename = `news-${timestamp}.json`;
    }

    const filepath = path.join(this.outputDir, filename);

    // Create data object with metadata
    const data = {
      scrapedAt: new Date().toISOString(),
      totalArticles: articles.length,
      articles: articles
    };

    try {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      console.log(`Saved ${articles.length} articles to: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save JSON: ${error.message}`);
    }
  }

  async saveToCsv(articles, filename = null) {
    await this.ensureOutputDir();

    // Generate filename if not provided
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      filename = `news-${timestamp}.csv`;
    }

    const filepath = path.join(this.outputDir, filename);

    // Define CSV headers
    const headers = [
      { id: 'title', title: 'Title' },
      { id: 'url', title: 'URL' },
      { id: 'description', title: 'Description' },
      { id: 'image', title: 'Image URL' },
      { id: 'date', title: 'Date' },
      { id: 'author', title: 'Author' },
      { id: 'scrapedAt', title: 'Scraped At' }
    ];

    try {
      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: headers
      });

      await csvWriter.writeRecords(articles);
      console.log(`Saved ${articles.length} articles to: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save CSV: ${error.message}`);
    }
  }

  async saveToBoth(articles) {
    const jsonPath = await this.saveToJson(articles);
    const csvPath = await this.saveToCsv(articles);

    return {
      json: jsonPath,
      csv: csvPath
    };
  }

  async appendToJson(articles, filename = 'accumulated-news.json') {
    await this.ensureOutputDir();

    const filepath = path.join(this.outputDir, filename);
    let existingData = { articles: [] };

    // Try to read existing file
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      existingData = JSON.parse(content);
    } catch {
      // File doesn't exist, will create new
    }

    // Merge articles, avoiding duplicates based on URL
    const existingUrls = new Set(existingData.articles.map(a => a.url));
    const newArticles = articles.filter(a => !existingUrls.has(a.url));

    existingData.articles.push(...newArticles);
    existingData.lastUpdated = new Date().toISOString();
    existingData.totalArticles = existingData.articles.length;

    await fs.writeFile(filepath, JSON.stringify(existingData, null, 2));
    console.log(`Appended ${newArticles.length} new articles to: ${filepath}`);
    return filepath;
  }

  async loadFromJson(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      return data.articles || data;
    } catch (error) {
      throw new Error(`Failed to load JSON: ${error.message}`);
    }
  }

  async cleanOldFiles(daysOld = 7) {
    await this.ensureOutputDir();

    const files = await fs.readdir(this.outputDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const filepath = path.join(this.outputDir, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        await fs.unlink(filepath);
        deletedCount++;
        console.log(`Deleted old file: ${file}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old file(s)`);
    }
  }
}

export default DataStorage;
