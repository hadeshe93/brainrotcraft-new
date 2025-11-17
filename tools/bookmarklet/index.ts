// @ts-nocheck

/**
 * 哥飞的 JS Bookmarklet 工具
 */

(function () {
  const supportedSuffixes = [
    'com',
    'box',
    'net',
    'org',
    'me',
    'xyz',
    'im',
    'info',
    'io',
    'co',
    'ai',
    'biz',
    'us',
    'app',
    'sg',
    'cafe',
    'now',
    'shop',
    'life',
    'cn',
    'uk',
    'chat',
    'design',
    'fun',
    'website',
    'link',
    'site',
    'online',
    'cards',
    'fr',
    'sk',
    'it',
    'new',
    'video',
  ];
  let domainCache = {};
  const STORAGE_KEY = 'domain_whois_cache';
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        domainCache = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
  }
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(domainCache));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }
  loadFromStorage();
  const style = document.createElement('style');
  style.textContent =
    '.domain-date{color:#2e7d32;font-weight:bold;background:#e8f5e8;padding:1px 3px;border-radius:2px;font-size:0.9em}';
  document.head.appendChild(style);
  function isSuffixSupported(domain) {
    const parts = domain.split('.');
    const suffix = parts[parts.length - 1];
    return supportedSuffixes.includes(suffix);
  }
  function parseDomain(domain) {
    const parts = domain.split('.');
    if (parts.length < 2) return null;
    const suffix = parts[parts.length - 1];
    const name = parts[parts.length - 2];
    return { name: name, suffix: suffix };
  }
  function queryWhois(domain) {
    return new Promise(function (resolve) {
      if (domainCache[domain] !== undefined) {
        resolve(domainCache[domain]);
        return;
      }
      const parsed = parseDomain(domain);
      if (!parsed) {
        domainCache[domain] = null;
        saveToStorage();
        resolve(null);
        return;
      }
      const name = parsed.name;
      const suffix = parsed.suffix;
      const url = 'https://whois.freeaiapi.xyz/?name=' + name + '&suffix=' + suffix + '&c=1';
      fetch(url)
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          let result = null;
          if (data && data.status === 'ok' && data.creation_datetime) {
            const dateStr = data.creation_datetime.trim();
            const date = new Date(dateStr);
            result = '(' + date.getFullYear() + '.' + (date.getMonth() + 1).toString().padStart(2, '0') + ')';
          }
          domainCache[domain] = result;
          saveToStorage();
          resolve(result);
        })
        .catch(function (e) {
          console.error('Query failed:', domain, e);
          domainCache[domain] = null;
          saveToStorage();
          resolve(null);
        });
    });
  }
  function extractDomainsFromText() {
    const domains = new Set();
    const domainRegex =
      /\b(?:[a-zA-Z0-9-]+\.)+(?:com|box|net|org|me|xyz|im|info|io|co|ai|biz|us|app|sg|cafe|now|shop|life|cn|uk|chat|design|fun|website|link|site|online|cards|fr|sk|it|new|video)\b/g;
    function processNode(node) {
      if (node.nodeType === 3) {
        const text = node.textContent;
        const matches = text.match(domainRegex);
        if (matches) {
          matches.forEach(function (domain) {
            domains.add(domain.toLowerCase());
          });
        }
      } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
        for (let i = 0; i < node.childNodes.length; i++) {
          processNode(node.childNodes[i]);
        }
      }
    }
    processNode(document.body);
    return Array.from(domains);
  }
  function replaceDomainInText(textNode, domain, datePrefix) {
    const text = textNode.textContent;
    const regex = new RegExp('\\b' + domain.replace(/\./g, '\\.') + '\\b', 'gi');
    if (regex.test(text)) {
      const parent = textNode.parentNode;
      const newHTML = text.replace(regex, function (match) {
        return '<span class="domain-date">' + datePrefix + '</span>' + match;
      });
      const wrapper = document.createElement('span');
      wrapper.innerHTML = newHTML;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, textNode);
      }
      parent.removeChild(textNode);
    }
  }
  function updateDomainDisplay(domain, datePrefix) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, function (node) {
      return node.textContent.toLowerCase().includes(domain) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    });
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    textNodes.forEach(function (textNode) {
      if (textNode.parentNode && textNode.parentNode.tagName !== 'SCRIPT' && textNode.parentNode.tagName !== 'STYLE') {
        replaceDomainInText(textNode, domain, datePrefix);
      }
    });
  }
  function processDomain(domain) {
    return new Promise(function (resolve) {
      if (!isSuffixSupported(domain)) {
        resolve();
        return;
      }
      queryWhois(domain).then(function (datePrefix) {
        if (datePrefix) {
          updateDomainDisplay(domain, datePrefix);
        }
        resolve();
      });
    });
  }
  function main() {
    const domains = extractDomainsFromText();
    if (domains.length === 0) {
      alert('No domains found in page text');
      return;
    }
    console.log('Found domains:', domains);
    const uniqueDomains = Array.from(new Set(domains));
    const progressDiv = document.createElement('div');
    progressDiv.id = 'domain-progress';
    progressDiv.style.cssText =
      'position:fixed;top:10px;right:10px;background:#333;color:white;padding:10px;border-radius:5px;z-index:10000;font-size:14px';
    progressDiv.textContent = 'Processing ' + uniqueDomains.length + ' unique domains...';
    document.body.appendChild(progressDiv);
    const batchSize = 3;
    let currentIndex = 0;
    function processBatch() {
      if (currentIndex >= uniqueDomains.length) {
        setTimeout(function () {
          const elem = document.getElementById('domain-progress');
          if (elem) elem.remove();
        }, 2000);
        return;
      }
      const batch = uniqueDomains.slice(currentIndex, currentIndex + batchSize);
      Promise.all(batch.map(processDomain)).then(function () {
        currentIndex += batchSize;
        progressDiv.textContent =
          'Processed ' + Math.min(currentIndex, uniqueDomains.length) + '/' + uniqueDomains.length + ' domains';
        setTimeout(processBatch, 800);
      });
    }
    processBatch();
  }
  main();
})();
