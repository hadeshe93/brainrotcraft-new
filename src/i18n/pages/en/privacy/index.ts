import { CAPITALIZED_DOMAIN } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_PRIVACY } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Privacy Policy - ${CAPITALIZED_DOMAIN}`,
    description: `Privacy Policy for ${CAPITALIZED_DOMAIN} - Learn how we handle your information when you use our service.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_PRIVACY,
    ],
  },
};