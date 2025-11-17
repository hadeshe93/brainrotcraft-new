import { BRAND_NAME } from "@/constants/config";
import { BREADCRUMB_HOME, BREADCRUMB_FEEDBACK } from "../common/breadcrumb";
const TITLE = 'Maklum Balas';
const META_TITLE = `${TITLE} - ${BRAND_NAME}`;
const DESCRIPTION = `Hubungi pasukan ${BRAND_NAME} untuk sokongan, maklum balas, atau perkongsian.`;

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
      `Sama ada anda mempunyai soalan tentang ${BRAND_NAME}, memerlukan sokongan teknikal, ingin meneroka perkongsian, atau bahkan meminta ciri, kami bersedia untuk membantu anda.`,
    ],
  },
  feedback: {
    submitted: {
      title: 'Terima kasih atas maklum balas anda',
      description: 'Kami akan menghubungi anda secepat mungkin',
      backToHome: 'Kembali ke Laman Utama',
    },
  },
  breadcrumb: {
    items: [
      BREADCRUMB_HOME,
      BREADCRUMB_FEEDBACK,
    ],
  },
};
