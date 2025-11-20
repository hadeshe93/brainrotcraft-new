import { scrapeSimilarWeb } from './index';

/**
 * Example usage of SimilarWeb scraper
 */

async function main() {
  console.log('='.repeat(60));
  console.log('SimilarWeb Scraper - Example Usage');
  console.log('='.repeat(60));

  // Example 1: Scrape a single domain
  console.log('\n📌 Example 1: Scraping github.com\n');

  const result1 = await scrapeSimilarWeb('github.com');

  if (result1.success) {
    console.log(`\n✅ Successfully scraped ${result1.domain}`);
    console.log(`   Check the output/ directory for the HTML file`);
  } else {
    console.error(`\n❌ Failed to scrape ${result1.domain}: ${result1.error}`);
  }

  // Example 2: Scrape with full URL
  console.log('\n\n📌 Example 2: Scraping with full URL\n');

  const result2 = await scrapeSimilarWeb('https://www.example.com');

  if (result2.success) {
    console.log(`\n✅ Successfully scraped ${result2.domain}`);
  } else {
    console.error(`\n❌ Failed to scrape ${result2.domain}: ${result2.error}`);
  }

  // Example 3: Sequential scraping of multiple domains
  console.log('\n\n📌 Example 3: Sequential scraping of multiple domains\n');

  const domains = ['google.com', 'facebook.com'];

  for (const domain of domains) {
    console.log(`\n--- Scraping ${domain} ---\n`);
    const result = await scrapeSimilarWeb(domain);

    if (result.success) {
      console.log(`✅ ${domain}: Success`);
    } else {
      console.log(`❌ ${domain}: Failed - ${result.error}`);
    }
  }

  console.log('\n\n='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60));
}

// Run examples
main()
  .then(() => {
    console.log('\n✅ Example execution completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Example execution failed:', error);
    process.exit(1);
  });
