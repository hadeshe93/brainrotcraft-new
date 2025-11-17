import { BRAND_NAME, CAPITALIZED_DOMAIN } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_TERMS } from "../common/breadcrumb";
import content from './content.md';

export default {
  metadata: {
    title: `Terma Perkhidmatan | ${CAPITALIZED_DOMAIN}`,
    description: `Terma Perkhidmatan untuk ${CAPITALIZED_DOMAIN} - Ketahui tentang peraturan dan terma yang mengawal penggunaan anda terhadap laman web kami.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_TERMS,
    ],
  },
};
