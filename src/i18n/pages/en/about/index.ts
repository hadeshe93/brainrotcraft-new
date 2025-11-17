import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_ABOUT } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `About Us - ${BRAND_NAME}`,
    description: `Learn more about how ${BRAND_NAME} was built, and who we are.`,
  },
  content: {
    introduction: content,
    members: [],
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_ABOUT,
    ],
  },
};