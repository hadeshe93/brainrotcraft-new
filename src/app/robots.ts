import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXTAUTH_URL || 'https://brainrotcraft.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/cdn-cgi/', '/admin/', '/api/', '/auth/', '/payment/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
