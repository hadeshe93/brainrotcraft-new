import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { chromium, type Cookie } from 'playwright';
import { TARGET_DOMAINS, COOKIE } from './config';

/**
 * Parse cookie string to Playwright cookie objects
 */
function parseCookies(cookieString: string, domain: string): Cookie[] {
  return cookieString
    .split(';')
    .map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('='); // Handle values with '=' in them
      return {
        name: name.trim(),
        value: value.trim(),
        domain: domain.startsWith('.') ? domain : `.${domain}`,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax' as const,
      };
    })
    .filter((c) => c.name && c.value);
}

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
 * Build request URL
 */
function buildRequestUrl(domain: string): string {
  const baseUrl = 'https://sem.3ue.com/backlinks/webapi2/';
  const params = new URLSearchParams({
    action: 'export',
    key: 'b2f5ff47436671b6e533d8dc3614845d',
    type: 'backlinks',
    export_columns:
      'page_ascore,source_title,source_url,target_url,anchor,external_num,internal_num,nofollow,sponsored,ugc,text,frame,form,image,sitewide,first_seen,last_seen,newlink,lostlink',
    target: domain,
    target_type: 'root_domain',
    export: 'csv',
    display_filter: '-|type||lostlink',
    sort_field: 'page_ascore',
    sort_type: 'desc',
    perdomain: '1',
    __gmitm: 'ayWzA3*l4EVcTpZei43sW*qRvljSdU',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Download data for a single domain using Playwright
 */
async function downloadSingle(
  urlOrDomain: string,
  outputDir: string,
): Promise<{ success: boolean; domain: string; error?: string }> {
  let browser;
  try {
    const domain = extractDomain(urlOrDomain);
    const requestUrl = buildRequestUrl(domain);

    console.log(`Downloading: ${domain}`);

    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    // Create context with cookies
    const cookies = parseCookies(COOKIE, '3ue.com');
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
      },
    });

    await context.addCookies(cookies);

    const page = await context.newPage();

    let csvData = '';

    // Set up download handler before navigation
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    // Navigate to the export URL (this will trigger the download)
    // Don't await goto since it will fail when download starts
    page.goto(requestUrl).catch(() => {
      // Ignore the error - download starting is expected
    });

    // Wait for download to start
    const download = await downloadPromise;

    // Get the download stream and read it
    const stream = await download.createReadStream();
    if (!stream) {
      throw new Error('Failed to create download stream');
    }

    // Read the stream into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    csvData = Buffer.concat(chunks).toString('utf-8');

    if (!csvData || csvData.trim().length === 0) {
      throw new Error('Empty response data');
    }

    // Generate filename: use domain as filename
    const fileName = `${domain.replace(/\./g, '_')}_backlinks.csv`;
    const filePath = path.join(outputDir, fileName);

    // Save file
    fs.writeFileSync(filePath, csvData, 'utf-8');

    console.log(`Success: ${domain} -> ${fileName}`);

    await browser.close();
    return { success: true, domain };
  } catch (error) {
    const domain = extractDomain(urlOrDomain);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed: ${domain} - ${errorMessage}`);

    if (browser) {
      await browser.close();
    }

    return { success: false, domain, error: errorMessage };
  }
}

/**
 * Batch download backlinks files
 *
 * @param urls - Array of URLs or domain strings
 * @param parallel - Whether to download in parallel, default false (serial download)
 * @returns Returns { success: success count, failed: failed count, total: total count }
 */
export async function downloadBacklinks(
  urls: string[],
  parallel: boolean = false,
): Promise<{ success: number; failed: number; total: number }> {
  // Ensure output folder exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nStarting batch download, mode: ${parallel ? 'parallel' : 'serial'}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Total ${urls.length} domains\n`);

  let results: Array<{ success: boolean; domain: string; error?: string }>;

  if (parallel) {
    // Parallel download
    results = await Promise.all(urls.map((url) => downloadSingle(url, outputDir)));
  } else {
    // Serial download
    results = [];
    for (const url of urls) {
      const result = await downloadSingle(url, outputDir);
      results.push(result);
    }
  }

  // Calculate statistics
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  console.log(`\nDownload completed:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log(`  Total: ${urls.length}`);

  // If there are failures, list failed domains
  if (failedCount > 0) {
    console.log(`\nFailed domains:`);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.domain}: ${r.error}`);
      });
  }

  return {
    success: successCount,
    failed: failedCount,
    total: urls.length,
  };
}

// If running this file directly, execute example
if (require.main === module) {
  downloadBacklinks(TARGET_DOMAINS, false)
    .then((result) => {
      console.log('\nFinal result:', result);
    })
    .catch((error) => {
      console.error('Execution failed:', error);
    });
}
