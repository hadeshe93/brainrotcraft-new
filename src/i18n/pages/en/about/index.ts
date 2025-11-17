import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_ABOUT } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `About - ${BRAND_NAME}`,
    description: `Learn about ${BRAND_NAME} and our mission.`,
  },
  content: {
    introduction: content,
    members: [
    ],
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_ABOUT,
    ],
  },
};