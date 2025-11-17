import { BRAND_NAME, CAPITALIZED_DOMAIN } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_TERMS } from "../common/breadcrumb";
import content from './content.md';

export default {
  metadata: {
    title: `Terms of Service | ${CAPITALIZED_DOMAIN}`,
    description: `Terms of Service for ${CAPITALIZED_DOMAIN} - Learn about the rules and terms that govern your use of our website.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_TERMS,
    ],
  },
};