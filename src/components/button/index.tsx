import { Button, ButtonProps } from '@/components/ui/button';
import MdiLoading from '~icons/mdi/loading';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingIconClassName?: string;
}
export function LoadingButton(props: LoadingButtonProps) {
  const { loading, children, loadingIconClassName, ...rest } = props;
  return (
    <Button {...rest} disabled={loading}>
      {loading && <MdiLoading className={cn('size-4 animate-spin', loadingIconClassName)} />}
      {children}
    </Button>
  );
}
