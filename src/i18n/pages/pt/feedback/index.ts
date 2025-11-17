import { BRAND_NAME } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_FEEDBACK } from "../common/breadcrumb";
const TITLE = 'Feedback';
const META_TITLE = `${TITLE} - ${BRAND_NAME}`;
const DESCRIPTION = `Entre em contato com a equipe do ${BRAND_NAME} para suporte, feedback ou parcerias.`;

export default {
  metadata: {
    title: META_TITLE,
    description: DESCRIPTION,
    og: {
      title: META_TITLE,
      description: DESCRIPTION,
    },
  },
  introduction: {
    title: TITLE,
    description: [
      DESCRIPTION,
      `Seja você tendo dúvidas sobre o ${BRAND_NAME}, precisando de suporte técnico, querendo explorar uma parceria ou até solicitar um recurso, estamos prontos para ajudá-lo.`,
    ],
  },
  feedback: {
    submitted: {
      title: 'Obrigado pelo seu feedback',
      description: 'Entraremos em contato com você o mais breve possível',
      backToHome: 'Voltar ao Início',
    },
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_FEEDBACK,
    ],
  },
};
