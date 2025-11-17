import { BRAND_NAME } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_FEEDBACK } from "../common/breadcrumb";
const TITLE = 'Feedback';
const META_TITLE = `${TITLE} - ${BRAND_NAME}`;
const DESCRIPTION = `Get in touch with the ${BRAND_NAME} team for support, feedback, or partnerships.`;

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
      `Whether you have questions about ${BRAND_NAME}, need technical support, want to explore a partnership, or even request a feature, we are ready to assist you.`,
    ],
  },
  feedback: {
    submitted: {
      title: 'Thanks for your feedback',
      description: 'We will get back to you as soon as possible',
      backToHome: 'Back to Home',
    },
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_FEEDBACK,
    ],
  },
};
