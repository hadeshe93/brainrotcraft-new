import { CAPITALIZED_DOMAIN } from '@/constants/config';
import { BREADCRUMB_HOME, BREADCRUMB_PRIVACY } from "../common/breadcrumb";
import content from './content.md';


export default {
  metadata: {
    title: `Dasar Privasi - ${CAPITALIZED_DOMAIN}`,
    description: `Dasar Privasi untuk ${CAPITALIZED_DOMAIN} - Ketahui bagaimana kami mengendalikan maklumat anda apabila anda menggunakan perkhidmatan kami.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_PRIVACY,
    ],
  },
};
