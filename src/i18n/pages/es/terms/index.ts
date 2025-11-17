import { BRAND_NAME, CAPITALIZED_DOMAIN } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_TERMS } from "../common/breadcrumb";
import content from './content.md';

export default {
  metadata: {
    title: `Términos de servicio | ${CAPITALIZED_DOMAIN}`,
    description: `Términos de servicio para ${CAPITALIZED_DOMAIN} - Conoce las reglas y términos que rigen tu uso de nuestro sitio web.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_TERMS,
    ],
  },
};
