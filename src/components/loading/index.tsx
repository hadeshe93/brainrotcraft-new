import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SparklesContainer } from '@/components/ui/sparkles-text';
import { Progress } from '@/components/ui/progress';

export interface NormalLoadingProps {
  show: boolean;
  text?: string;
  className?: string;
}

export function NormalLoading(props: NormalLoadingProps) {
  const { show, text, className } = props;
  return (
    <div className={cn('absolute top-0 left-0 z-10 h-full w-full bg-white/50', show ? 'block' : 'hidden', className)}>
      <div className="from-primary/5 to-primary/10 flex h-full w-full animate-pulse items-center justify-center bg-gradient-to-br">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="border-primary size-8 animate-spin rounded-full border-3 border-t-transparent"></div>
            <div className="border-primary/20 absolute inset-0 animate-ping rounded-full border-2"></div>
          </div>
          <div className="text-center">
            {text ? <span className="text-primary block text-sm font-semibold">{text}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface SparklesLoadingProps {
  show: boolean;
  sparklesCount?: number;
  className?: string;
  progress?: number;
  text?: ReactNode;
  showPercentage?: boolean;
  progressClassName?: string;
  textClassName?: string;
}
export function SparklesLoading(props: SparklesLoadingProps) {
  const { show, className, sparklesCount = 25, progress, text, showPercentage, progressClassName, textClassName } = props;
  return (
    <div className={cn('absolute top-0 left-0 z-10 h-full w-full bg-black/70', show ? 'block' : 'hidden', className)}>
      <SparklesContainer
        className="size-full"
        sparklesCount={sparklesCount}
        colors={{ first: '#F19D38', second: '#F19D38' }}
      >
        <div className="flex size-full flex-col items-center justify-center gap-4">
          {text && (
            <div className={cn('rounded-lg bg-white/10 px-6 py-3 backdrop-blur-sm')}>
              <p className={cn('p-0 text-sm font-medium text-white', textClassName)}>{text}</p>
            </div>
          )}

          {progress !== undefined && (
            <div className="flex flex-col items-center gap-2">
              <Progress
                value={progress}
                className={cn(
                  'h-3 w-64 backdrop-blur-sm',
                  '[&>*]:!bg-[#F19D38]',
                  progressClassName
                )}
              />
              {showPercentage && (
                <span className="inline-flex items-center gap-2 text-sm text-white/80">
                  {progress}%
                </span>
              )}
            </div>
          )}
        </div>
      </SparklesContainer>
    </div>
  );
}

export interface PureMaskProps {
  show: boolean;
  className?: string;
  children?: ReactNode;
}
export function PureMask(props: PureMaskProps) {
  const { show, className, children } = props;
  return (
    <div className={cn('absolute top-0 left-0 z-10 h-full w-full bg-black/70', show ? 'block' : 'hidden', className)}>
      {children}
    </div>
  );
}
