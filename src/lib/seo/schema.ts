export interface SchemaProduct {
  '@context': string;
  '@type': 'Product';
  name: string;
  description: string;
  brand: {
    '@type': 'Brand';
    name: string;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    reviewCount: string;
  };
  offers?: {
    '@type': 'Offer';
    priceCurrency: string;
    price: string;
    availability: string;
  };
}

export interface SchemaHowTo {
  '@context': string;
  '@type': 'HowTo';
  name: string;
  description: string;
  step: Array<{
    '@type': 'HowToStep';
    name: string;
    text: string;
  }>;
}

export interface SchemaFAQPage {
  '@context': string;
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export interface SchemaBreadcrumb {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
}

export interface SchemaOrganization {
  '@context': string;
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}

export interface SchemaWebSite {
  '@context': string;
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: {
      '@type': 'EntryPoint';
      urlTemplate: string;
    };
    'query-input': string;
  };
}

// Helper functions to generate Schema markup
export function generateProductSchema(
  name: string,
  description: string,
  price?: number,
  rating?: { value: number; count: number },
): SchemaProduct {
  const schema: SchemaProduct = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: {
      '@type': 'Brand',
      name: 'gamesramp',
    },
  };

  if (rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value.toString(),
      reviewCount: rating.count.toString(),
    };
  }

  if (price !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: price.toString(),
      availability: 'https://schema.org/InStock',
    };
  }

  return schema;
}

export function generateHowToSchema(
  title: string,
  description: string,
  steps: Array<{ name: string; text: string }>,
): SchemaHowTo {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.name,
      text: s.text,
    })),
  };
}

export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): SchemaFAQPage {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): SchemaBreadcrumb {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://gamesramp.com${item.url}`,
    })),
  };
}

export function generateOrganizationSchema(): SchemaOrganization {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'gamesramp',
    url: 'https://gamesramp.com',
    logo: 'https://gamesramp.com/logo.png',
    sameAs: [
      // Add social media URLs when available
    ],
  };
}

export function generateWebSiteSchema(): SchemaWebSite {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'gamesramp - AI Polaroid Generator',
    url: 'https://gamesramp.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://gamesramp.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
