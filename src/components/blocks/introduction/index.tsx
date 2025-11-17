import { Introduction as IntroductionType } from '@/types/blocks/introduction';
import { cn } from '@/lib/utils';

interface IntroductionProps {
  configs: IntroductionType;
  className?: string;
}

export default function Introduction(props: IntroductionProps) {
  const { configs, className } = props;
  return (
    <div className={cn('mx-auto', className)}>
      <h1 className="text-foreground text-4xl font-bold md:text-5xl lg:text-6xl">{configs.title}</h1>
      <div className="mt-6 md:mt-8">
        {configs.description.map((desc, index) => (
          <p key={index} className="text-muted-foreground mt-4">
            {desc}
          </p>
        ))}
      </div>
    </div>
  );
}
