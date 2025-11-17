'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MdiInformation from '~icons/mdi/information';
import { toast } from 'sonner';

interface LanguageConfig {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
  isDefault?: boolean;
  enabled?: boolean;
  sortOrder?: number;
}

interface LanguageFormData {
  code: string;
  nativeName: string;
  chineseName: string;
  englishName: string;
}

interface LanguageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: LanguageConfig | null; // null = add, object = edit
  onSave: (data: LanguageFormData) => Promise<void>;
}

export function LanguageFormDialog({ open, onOpenChange, language, onSave }: LanguageFormDialogProps) {
  const [formData, setFormData] = useState<LanguageFormData>({
    code: '',
    nativeName: '',
    chineseName: '',
    englishName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (language) {
      setFormData({
        code: language.code,
        nativeName: language.nativeName,
        chineseName: language.chineseName,
        englishName: language.englishName,
      });
    } else {
      setFormData({
        code: '',
        nativeName: '',
        chineseName: '',
        englishName: '',
      });
    }
  }, [language, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      toast.success(language ? '语言更新成功' : '语言添加成功');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{language ? `编辑语言: ${language.nativeName}` : '新增语言'}</DialogTitle>
          <DialogDescription>{language ? '修改语言的显示名称信息' : '添加一个新的语言支持'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Language Code */}
          <div className="space-y-2">
            <Label htmlFor="code">语言代码 *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例如: zh, ja, es, ko"
              required
              pattern="[a-z]{2}(-[A-Z]{2})?"
              disabled={!!language} // Cannot edit code
            />
            {language ? (
              <p className="text-muted-foreground text-xs">⚠️ 语言代码创建后不可修改</p>
            ) : (
              <p className="text-muted-foreground text-xs">示例: en, zh, ja, es, ko, pl, zh-Hant</p>
            )}
          </div>

          {/* Native Name */}
          <div className="space-y-2">
            <Label htmlFor="nativeName">当地语言名称 *</Label>
            <Input
              id="nativeName"
              value={formData.nativeName}
              onChange={(e) => setFormData({ ...formData, nativeName: e.target.value })}
              placeholder="用该语言书写的名称"
              required
            />
            <p className="text-muted-foreground text-xs">例如: 简体中文, English, 日本語, Español</p>
          </div>

          {/* Chinese Name */}
          <div className="space-y-2">
            <Label htmlFor="chineseName">简体中文名称 *</Label>
            <Input
              id="chineseName"
              value={formData.chineseName}
              onChange={(e) => setFormData({ ...formData, chineseName: e.target.value })}
              placeholder="用简体中文描述该语言"
              required
            />
            <p className="text-muted-foreground text-xs">例如: 简体中文, 英语, 日语, 西班牙语</p>
          </div>

          {/* English Name */}
          <div className="space-y-2">
            <Label htmlFor="englishName">英文名称 *</Label>
            <Input
              id="englishName"
              value={formData.englishName}
              onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
              placeholder="English name of the language"
              required
            />
            <p className="text-muted-foreground text-xs">例如: Simplified Chinese, English, Japanese, Spanish</p>
          </div>

          {/* Notice for new language */}
          {!language && (
            <Alert>
              <MdiInformation className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ℹ️ 新增语言后，您可以通过「自动化翻译」功能批量翻译所有内容， 或在各个编辑页面手动添加翻译。
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : language ? '保存修改' : '确认新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
