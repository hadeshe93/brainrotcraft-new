import { BRAND_NAME, CAPITALIZED_DOMAIN } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_TERMS } from "../common/breadcrumb";
import content from './content.md';

export default {
  metadata: {
    title: `Termos de Serviço | ${CAPITALIZED_DOMAIN}`,
    description: `Termos de Serviço para ${CAPITALIZED_DOMAIN} - Saiba mais sobre as regras e termos que regem o uso de nosso site.`,
  },
  content,
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_TERMS,
    ],
  },
};
