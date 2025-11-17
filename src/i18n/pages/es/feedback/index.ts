import { BRAND_NAME } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_FEEDBACK } from "../common/breadcrumb";
const TITLE = 'Comentarios';
const META_TITLE = `${TITLE} - ${BRAND_NAME}`;
const DESCRIPTION = `Ponte en contacto con el equipo de ${BRAND_NAME} para soporte, comentarios o asociaciones.`;

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
      `Si tienes preguntas sobre ${BRAND_NAME}, necesitas soporte técnico, quieres explorar una asociación o solicitar una función, estamos aquí para ayudarte.`,
    ],
  },
  feedback: {
    submitted: {
      title: 'Gracias por tus comentarios',
      description: 'Te responderemos lo antes posible',
      backToHome: 'Volver al inicio',
    },
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_FEEDBACK,
    ],
  },
};
