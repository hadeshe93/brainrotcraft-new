import { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import DownloadButton from '@/components/blocks/download-button';
import { UserWork } from '@/services/user/profile';
import { BIZ_NAME } from '@/constants/config';
interface WorkDetailModalProps {
  work: UserWork;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkDetailModal({ work, isOpen, onClose }: WorkDetailModalProps) {
  const t = useTranslations('user_profile');
  const [imageError, setImageError] = useState(false);
  const format = useFormatter();
  const formatDate = (date: Date) => {
    return format.dateTime(date, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle>{t('work_details')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 图片区域 */}
          <div className="lg:col-span-2">
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted">
              {!imageError ? (
                <img
                  src={work.workResult}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon 
                    config={{ name: 'MdiImageOutline' }} 
                    className="w-16 h-16 text-muted-foreground" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* 信息区域 */}
          <div className="space-y-4">
            {/* 作品ID */}
            <div>
              <h3 className="font-semibold mb-2">{t('work_id')}</h3>
              <p className="text-sm text-muted-foreground whitespace-normal break-all">
                {work.uuid}
              </p>
            </div>

            {/* 创建时间 */}
            <div>
              <h3 className="font-semibold mb-2">{t('created_at')}</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(new Date(work.createdAt!))}
              </p>
            </div>

            {/* 作品类型 */}
            <div>
              <h3 className="font-semibold mb-2">Type</h3>
              <div className="flex items-center gap-2">
                <Icon 
                  config={{ 
                    name: work.workType === 'text_to_image' ? 'MdiSparkles' : 'MdiImageOutline' 
                  }} 
                  className="w-4 h-4" 
                />
                <span className="text-sm capitalize">
                  {work.workType.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* 消耗积分 */}
            <div>
              <h3 className="font-semibold mb-2">Credits Used</h3>
              <div className="flex items-center gap-2">
                <Icon config={{ name: 'EpCoin' }} className="w-4 h-4" />
                <span className="text-sm">
                  {work.creditsConsumed}
                </span>
              </div>
            </div>

            {/* 下载按钮 */}
            <div className="">
              <DownloadButton
                url={work.workResult}
                filename={`${BIZ_NAME}-${work.uuid}.png`}
                className="w-full px-2 py-2 text-sm"
              >
                {t('download_image')}
              </DownloadButton>
            </div>

            {/* 关闭按钮 */}
            <div className="">
              <Button 
                onClick={onClose}
                variant="outline"
                className="w-full px-2 py-2 text-sm"
              >
                {t('close_modal')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}