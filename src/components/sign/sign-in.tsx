import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app';

export default function SignIn() {
  const t = useTranslations('user');
  const appContext = useAppContext();
  const onClick = () => {
    appContext?.setShowSignModal(true);
  }
  return (
    <Button variant="default" onClick={onClick} className='cursor-pointer'>
      <span>{t('sign_in')}</span>
    </Button>
  );
}
