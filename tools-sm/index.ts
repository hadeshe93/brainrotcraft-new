import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { TARGET_DOMAINS, CONFIG } from './config';

/**
 * Extract domain from URL or domain string
 */
function extractDomain(urlOrDomain: string): string {
  try {
    // If input is a pure domain without protocol, add protocol before parsing
    const urlString = urlOrDomain.includes('://') ? urlOrDomain : `https://${urlOrDomain}`;

    const url = new URL(urlString);
    // Return hostname (e.g. www.example.com or example.com)
    return url.hostname;
  } catch (error) {
    // If parsing fails, assume input is already a domain
    return urlOrDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Build SimilarWeb URL for a given domain
 */
function buildSimilarWebUrl(domain: string): string {
  return `https://www.similarweb.com/website/${domain}/`;
}

/**
 * Scrape SimilarWeb data for a single domain using Playwright
 *
 * This function handles SimilarWeb's 202 -> verification -> 200 flow:
 * 1. Initial request returns 202 with verification scripts
 * 2. Verification scripts execute and inject cookies automatically
 * 3. Page reloads with proper cookies and returns 200
 */
async function scrapeSingle(
  urlOrDomain: string,
  outputDir: string,
): Promise<{ success: boolean; domain: string; error?: string }> {
  let browser: Browser | undefined;
  try {
    const domain = extractDomain(urlOrDomain);
    const requestUrl = buildSimilarWebUrl(domain);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scraping: ${domain}`);
    console.log(`URL: ${requestUrl}`);
    console.log(`${'='.repeat(60)}\n`);

    // Launch browser (visible for observation)
    browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
    });

    // Create context with realistic browser settings
    const context = await browser.newContext({
      userAgent: CONFIG.userAgent,
      viewport: CONFIG.viewport,
      extraHTTPHeaders: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
      },
    });

    const page = await context.newPage();

    // Set up request/response logging for visibility
    let requestCount = 0;
    let responseCount = 0;

    page.on('request', (request) => {
      requestCount++;
      const url = request.url();
      // Only log non-asset requests
      if (
        !url.includes('.png') &&
        !url.includes('.jpg') &&
        !url.includes('.css') &&
        !url.includes('.woff')
      ) {
        console.log(`→ [REQUEST #${requestCount}] ${request.method()} ${url.substring(0, 100)}`);
      }
    });

    page.on('response', (response) => {
      responseCount++;
      const url = response.url();
      const status = response.status();

      // Only log non-asset responses
      if (
        !url.includes('.png') &&
        !url.includes('.jpg') &&
        !url.includes('.css') &&
        !url.includes('.woff')
      ) {
        console.log(`← [RESPONSE #${responseCount}] [${status}] ${url.substring(0, 100)}`);
      }

      // Highlight important status codes
      if (status === 202) {
        console.log(`   ⚠️  Received 202 - Verification flow starting...`);
      } else if (status === 200 && url.includes('similarweb.com/website/')) {
        console.log(`   ✅ Received 200 - Verification completed!`);
      }
    });

    // Log browser console messages
    page.on('console', (msg) => {
      console.log(`   [BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    // Navigate to SimilarWeb page
    console.log(`\n🚀 Navigating to SimilarWeb...`);

    const response = await page.goto(requestUrl, {
      waitUntil: 'networkidle', // Wait for network to be idle (handles verification)
      timeout: CONFIG.timeout,
    });

    console.log(`\n📊 Initial response status: ${response?.status() || 'unknown'}`);

    // Log cookies after navigation
    const cookies = await context.cookies();
    console.log(`\n🍪 Cookies received: ${cookies.length} cookies`);
    if (cookies.length > 0) {
      console.log(`   Cookie names: ${cookies.map((c) => c.name).join(', ')}`);
    }

    // Wait for page to stabilize after verification
    console.log(`\n⏳ Waiting ${CONFIG.stabilizationDelay}ms for page to stabilize...`);
    await page.waitForTimeout(CONFIG.stabilizationDelay);

    // Extract final HTML content
    console.log(`\n📄 Extracting page content...`);
    const html = await page.content();

    if (!html || html.trim().length === 0) {
      throw new Error('Empty HTML content received');
    }

    // Check if we got meaningful content (not just verification page)
    if (html.includes('verification') && html.length < 10000) {
      console.log(`   ⚠️  Warning: Page might still be in verification state`);
    }

    // Get page title for verification
    const title = await page.title();
    console.log(`   Page title: ${title}`);
    console.log(`   HTML size: ${(html.length / 1024).toFixed(2)} KB`);

    // Generate filename
    const fileName = `${domain.replace(/\./g, '_')}_similarweb.html`;
    const filePath = path.join(outputDir, fileName);

    // Save file
    fs.writeFileSync(filePath, html, 'utf-8');

    console.log(`\n✅ Success: ${domain} -> ${fileName}`);
    console.log(`   Total requests: ${requestCount}`);
    console.log(`   Total responses: ${responseCount}`);

    await browser.close();
    return { success: true, domain };
  } catch (error) {
    const domain = extractDomain(urlOrDomain);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Failed: ${domain} - ${errorMessage}`);

    if (browser) {
      await browser.close();
    }

    return { success: false, domain, error: errorMessage };
  }
}

/**
 * Scrape SimilarWeb data for a single domain
 *
 * @param domain - Domain name or URL to scrape
 * @returns Returns { success: boolean, domain: string, error?: string }
 */
export async function scrapeSimilarWeb(
  domain: string,
): Promise<{ success: boolean; domain: string; error?: string }> {
  // Ensure output folder exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n${'*'.repeat(60)}`);
  console.log(`SimilarWeb Scraper`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`${'*'.repeat(60)}`);

  const result = await scrapeSingle(domain, outputDir);

  console.log(`\n${'*'.repeat(60)}`);
  if (result.success) {
    console.log(`✅ Scraping completed successfully!`);
  } else {
    console.log(`❌ Scraping failed: ${result.error}`);
  }
  console.log(`${'*'.repeat(60)}\n`);

  return result;
}

// If running this file directly, execute with first domain from config
if (require.main === module) {
  const testDomain = TARGET_DOMAINS[0];
  if (!testDomain) {
    console.error('❌ Error: No domains configured in TARGET_DOMAINS');
    process.exit(1);
  }

  console.log(`\n🎯 Testing with domain: ${testDomain}`);

  scrapeSimilarWeb(testDomain)
    .then((result) => {
      console.log('\n📊 Final result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Execution failed:', error);
      process.exit(1);
    });
}
