import { BRAND_NAME } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_ABOUT } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Tentang Kami - ${BRAND_NAME}`,
    description: `Ketahui lebih lanjut tentang bagaimana ${BRAND_NAME} dibina, dan siapa kami.`,
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
