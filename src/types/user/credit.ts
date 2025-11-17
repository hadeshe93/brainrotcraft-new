
// ========================================
// 新版积分系统类型定义（统一管理）
// ========================================

/**
 * 积分任务类型
 */
export type CreditTaskType = 'text_to_image' | 'image_to_image' | 'text_to_text';

/**
 * 预扣积分记录
 */
export interface PendingCreditReservation {
  /** 预测任务 ID */
  predictionId: string;
  /** 预扣积分数量 */
  creditsAmount: number;
  /** 预扣时间戳 */
  reservedAt: number;
  /** 任务类型 */
  taskType: CreditTaskType;
  /** 任务描述信息（用于流水记录） */
  taskDescription?: string;
  /** 预扣来源分配详情 */
  deductionSource?: {
    /** 从订阅周期扣除的积分量 */
    fromCycleCredits: number;
    /** 从永久积分扣除的积分量 */
    fromPermanentCredits: number;
  };
}

/**
 * 订阅周期信息
 */
export interface SubscriptionCycle {
  /** 周期开始时间 */
  startTime: number;
  /** 周期结束时间 */
  endTime: number;
}

/**
 * 积分状态
 */
export type CreditsStatus = 'healthy' | 'warning' | 'critical';

/**
 * 用户积分信息（前端使用的统一接口）
 */
export interface UserCreditsInfo {
  /** 可用积分（订阅 + 永久 - 预扣） */
  availableCredits: number;
  /** 当前周期总积分 */
  totalCreditsInCurrentCycle: number;
  /** 当前周期已使用积分 */
  usedCreditsInCurrentCycle: number;
  /** 预扣中的积分 */
  pendingCredits: number;
  /** 订阅周期信息 */
  subscriptionCycle: SubscriptionCycle;
  /** 永久积分总量 */
  totalPermanentCredits: number;
  /** 永久积分已使用量 */
  usedPermanentCredits: number;
  /** 永久积分可用量 */
  availablePermanentCredits: number;
  /** 预扣详情列表 */
  pendingReservations: PendingCreditReservation[];
  /** 积分状态（用于UI显示） */
  status?: CreditsStatus;
}

/**
 * 积分池状态（内部使用，与DO存储结构保持一致）
 */
export interface UserCreditsPoolState {
  /** 用户 UUID */
  userUuid: string;
  /** 当前订阅周期内总积分 */
  totalCreditsInCurrentCycle: number;
  /** 当前周期已消耗积分 */
  usedCreditsInCurrentCycle: number;
  /** 当前订阅周期开始时间 */
  currentCycleStartTime: number;
  /** 当前订阅周期结束时间 */
  currentCycleEndTime: number;
  /** 永久积分总量 */
  totalPermanentCredits: number;
  /** 永久积分已使用量 */
  usedPermanentCredits: number;
  /** 预扣积分缓存列表 */
  pendingReservations: Record<string, PendingCreditReservation>;
  /** 状态最后更新时间 */
  lastUpdatedAt: number;
}

/**
 * 积分历史记录
 */
export interface CreditHistoryRecord {
  uuid: string;
  creditsAmount: number;
  expenseType: string;
  workRelationUuid?: string;
  remarks?: string;
  createdAt: number;
}

