'use client';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { useScroll } from '@/hooks/use-scroll';

interface UpToTopProps {
  threshold?: number;
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export default function UpToTop({ threshold = 500 }: UpToTopProps) {
  const { y } = useScroll();
  const isVisible = y > threshold;

  if (!isVisible) {
    return null;
  }

  return (
    <Button variant="ghost" size="icon" className="fixed bottom-4 right-4 text-primary hover:bg-primary/10" onClick={scrollToTop}>
      <Icon
        config={{
          name: 'MdiChevronUpCircleOutline',
        }}
        className='size-10'
      />
    </Button>
  );
}
