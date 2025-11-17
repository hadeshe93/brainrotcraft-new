'use client';

import { Upload, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import Show from '@/components/show';
import { formatFileSize } from '@/lib/file';
import { useTranslations } from 'next-intl';
export interface FileUploaderProps {
  value?: File[];
  maxFiles?: number;
  maxSize?: number;
  onFileReject?: (file: File, message: string) => void;
  onChange?: (files: File[]) => void;
}

const MAX_FILES = 1;
const MAX_SIZE = 5 * 1024 * 1024;
export function FileUploader(props: FileUploaderProps) {
  const {
    value,
    maxFiles = MAX_FILES,
    maxSize = MAX_SIZE,
    onFileReject: onFileRejectRaw,
    onChange: onChangeRaw,
  } = props;
  const multiple = maxFiles > 1;
  const [files, setFiles] = useState<File[]>(value || []);
  const tForm = useTranslations('form');

  const onValueChange = (files: File[]) => {
    setFiles(files);
    onChangeRaw?.(files);
  };
  const onFileReject = (file: File, message: string) => {
    const fileNameRaw = file.name;
    const fileName = fileNameRaw.length > 20 ? `${fileNameRaw.slice(0, 20)}...` : fileNameRaw;
    const description = tForm('file_been_rejected', { file_name: fileName });
    toast(message, {
      description,
    });
    onFileRejectRaw?.(file, message);
  };

  const FileList = useCallback(() => (
    <FileUploadList className='h-[190px]'>
      {files.map((file, index) => (
        <FileUploadItem key={index} value={file}>
          <FileUploadItemPreview />
          <FileUploadItemMetadata />
          <FileUploadItemDelete asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <X />
            </Button>
          </FileUploadItemDelete>
        </FileUploadItem>
      ))}
    </FileUploadList>
  ), [files]);

  return (
    <FileUpload
      maxFiles={maxFiles}
      maxSize={maxSize}
      className="w-full"
      value={files}
      onValueChange={onValueChange}
      onFileReject={onFileReject}
      multiple={multiple}
    >
      <Show when={files.length === 0} fallback={<FileList />}>
        <FileUploadDropzone className='h-[190px]'>
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center rounded-full border p-2.5">
              <Upload className="text-muted-foreground size-6" />
            </div>
            <p className="text-sm font-medium">{tForm('drag_and_drop_files_here')}</p>
            <p className="text-muted-foreground text-xs">{tForm('or_click_to_browse')} ({tForm('max_files', { count: maxFiles })}, {tForm('max_size', { size: formatFileSize(maxSize) })})</p>
          </div>
          <FileUploadTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2 w-fit">
              {tForm('browse_files')}
            </Button>
          </FileUploadTrigger>
        </FileUploadDropzone>
      </Show>
    </FileUpload>
  );
}
