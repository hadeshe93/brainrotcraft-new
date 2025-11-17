export enum EUserWorkGenerationStatus {
  Generating = 'generating',
  Completed = 'completed',
  Failed = 'failed',
}

export enum EUserWorkType {
  TextToText = 'text_to_text',
  TextToImage = 'text_to_image',
  ImageToImage = 'image_to_image',
}

export enum EUserWorkManagementStatus {
  Active = 'active',
  Deleted = 'deleted',
}

// 用户作品类型定义
export interface UserWork {
  id?: number;
  uuid: string;
  userUuid: string;
  workType: EUserWorkType;
  inputContent: string;
  inputImageUrl?: string;
  workResult: string;
  generationDuration?: number;
  creditsConsumed: number;
  generationStatus: EUserWorkGenerationStatus;
  managementStatus?: EUserWorkManagementStatus;
  isPublic?: boolean;
  likesCount?: number;
  downloadsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}