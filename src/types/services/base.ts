export enum EOrderBy {
  CreatedAt = 'created_at',
  UpdatedAt = 'updated_at',
}

export enum EOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export interface ListData<T = any> {
  records: T[];
  /** 总记录数 */
  total: number;
  /** 分页信息 */
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
