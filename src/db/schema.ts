import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// 用户表
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    nickname: text('nickname'),
    email: text('email').notNull().unique(),
    avatar: text('avatar'), // 存储URL
    password: text('password'), // BCrypt 哈希值，可为空支持第三方登录
    accountProvider: text('account_provider'), // 如: 'google', 'github'
    providerAccountId: text('provider_account_id'), // 提供商侧的账号 ID
    ipAddress: text('ip_address'), // 支持 IPv6
    accountStatus: text('account_status', { enum: ['active', 'suspended', 'deleted'] }).default('active'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    uuidIdx: uniqueIndex('users_uuid_idx').on(table.uuid),
    providerIdx: uniqueIndex('users_provider_idx').on(table.accountProvider, table.providerAccountId),
    accountStatusIdx: index('users_account_status_idx').on(table.accountStatus),
  }),
);

// 订单表
export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    orderNumber: text('order_number').notNull().unique(), // 对用户展示的订单号
    userUuid: text('user_uuid').notNull(), // 外键关联用户表
    orderAmount: real('order_amount').notNull(), // 使用 real 存储金额，注意精度
    orderCurrency: text('order_currency').notNull().default('USD'), // 订单货币类型，如 "USD", "CNY"
    productUuid: text('product_uuid').notNull(), // 商品UUID（硬编码商品）
    productName: text('product_name').notNull(), // 商品名称快照
    productPriceSnapshot: real('product_price_snapshot').notNull(), // 订单时的商品价格
    creditsAmountSnapshot: integer('credits_amount_snapshot').notNull(), // 订单时的积分数量
    paymentTime: integer('payment_time'), // 可为空
    orderStatus: text('order_status', { enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'] }).notNull(),
    paymentMethod: text('payment_method'), // 如: 'stripe', 'paypal', 'paddle'
    paymentPlatformOrderId: text('payment_platform_order_id'), // 第三方支付平台的订单ID
    customerId: text('customer_id'), // 可为空, 仅订阅类商品使用，可以复用第三方支付平台的客户 ID
    subscriptionId: text('subscription_id'), // 可为空, 仅订阅类商品使用，可以复用第三方支付平台的订阅 ID
    subscriptionCycle: text('subscription_cycle', { enum: ['monthly', 'yearly'] }), // 可为空
    subscriptionStartTime: integer('subscription_start_time'), // 可为空
    subscriptionEndTime: integer('subscription_end_time'), // 可为空
    refundAmount: real('refund_amount').default(0.0), // 退款金额
    refundTime: integer('refund_time'), // 可为空
    remarks: text('remarks'), // 备注
    orderCreatedAt: integer('order_created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    orderUpdatedAt: integer('order_updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('orders_uuid_idx').on(table.uuid),
    orderNumberIdx: uniqueIndex('orders_order_number_idx').on(table.orderNumber),
    userUuidIdx: index('orders_user_uuid_idx').on(table.userUuid),
    orderStatusIdx: index('orders_order_status_idx').on(table.orderStatus),
    paymentMethodIdx: index('orders_payment_method_idx').on(table.paymentMethod),
    userCreatedIdx: index('orders_user_created_idx').on(table.userUuid, table.orderCreatedAt),
    statusCreatedIdx: index('orders_status_created_idx').on(table.orderStatus, table.orderCreatedAt),
  }),
);

// 用户作品表
export const userWorks = sqliteTable(
  'user_works',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    userUuid: text('user_uuid').notNull(), // 外键关联用户表
    workType: text('work_type', { enum: ['text_to_text', 'text_to_image', 'image_to_image'] }).notNull(),
    inputContent: text('input_content').notNull(), // 用户输入的提示词或描述
    inputImageUrl: text('input_image_url'), // 可为空, 图生图时使用
    workResult: text('work_result').notNull(), // 存储结果内容或URL
    generationDuration: integer('generation_duration'), // 毫秒, 用于性能监控
    creditsConsumed: integer('credits_consumed').notNull(), // 消耗积分数量
    generationStatus: text('generation_status', { enum: ['generating', 'completed', 'failed'] }).notNull(),
    managementStatus: text('management_status', { enum: ['active', 'deleted'] }).default('active'),
    isPublic: integer('is_public', { mode: 'boolean' }).default(false),
    likesCount: integer('likes_count').default(0),
    downloadsCount: integer('downloads_count').default(0),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('user_works_uuid_idx').on(table.uuid),
    userUuidIdx: index('user_works_user_uuid_idx').on(table.userUuid),
    workTypeIdx: index('user_works_work_type_idx').on(table.workType),
    generationStatusIdx: index('user_works_generation_status_idx').on(table.generationStatus),
    isPublicIdx: index('user_works_is_public_idx').on(table.isPublic),
    userCreatedIdx: index('user_works_user_created_idx').on(table.userUuid, table.createdAt),
    publicCreatedIdx: index('user_works_public_created_idx').on(table.isPublic, table.createdAt),
    typeCreatedIdx: index('user_works_type_created_idx').on(table.workType, table.createdAt),
  }),
);

// 用户积分收入流水表
export const userCreditIncome = sqliteTable(
  'user_credit_income',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    userUuid: text('user_uuid').notNull(), // 外键关联用户表
    creditsAmount: integer('credits_amount').notNull(), // 必须 > 0
    incomeType: text('income_type', {
      enum: ['purchase_one_time', 'purchase_monthly', 'purchase_yearly', 'promotion', 'refund', 'admin_grant'],
    }).notNull(),
    sourceRelationUuid: text('source_relation_uuid'), // 关联订单表的 UUID，部分类型可为空
    validStartTime: integer('valid_start_time').notNull(),
    validEndTime: integer('valid_end_time'), // NULL 表示永不过期
    remarks: text('remarks'), // 备注
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('user_credit_income_uuid_idx').on(table.uuid),
    userUuidIdx: index('user_credit_income_user_uuid_idx').on(table.userUuid),
    incomeTypeIdx: index('user_credit_income_income_type_idx').on(table.incomeType),
    sourceRelationIdx: index('user_credit_income_source_relation_idx').on(table.sourceRelationUuid),
    userCreatedIdx: index('user_credit_income_user_created_idx').on(table.userUuid, table.createdAt),
    userExpireIdx: index('user_credit_income_user_expire_idx').on(table.userUuid, table.validEndTime),
    typeCreatedIdx: index('user_credit_income_type_created_idx').on(table.incomeType, table.createdAt),
  }),
);

// 用户积分消耗流水表
export const userCreditExpense = sqliteTable(
  'user_credit_expense',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    userUuid: text('user_uuid').notNull(), // 外键关联用户表
    creditsAmount: integer('credits_amount').notNull(), // 必须 > 0
    expenseType: text('expense_type', { enum: ['generate_work', 'premium_feature', 'admin_deduct'] }).notNull(),
    sourceRelationUuid: text('source_relation_uuid'), // 关联作品表的 UUID 等
    businessScenario: text('business_scenario'), // 如: 'text_to_image', 'image_enhance'
    remarks: text('remarks'), // 备注
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uuidIdx: uniqueIndex('user_credit_expense_uuid_idx').on(table.uuid),
    userUuidIdx: index('user_credit_expense_user_uuid_idx').on(table.userUuid),
    expenseTypeIdx: index('user_credit_expense_expense_type_idx').on(table.expenseType),
    sourceRelationIdx: index('user_credit_expense_source_relation_idx').on(table.sourceRelationUuid),
    userCreatedIdx: index('user_credit_expense_user_created_idx').on(table.userUuid, table.createdAt),
    typeCreatedIdx: index('user_credit_expense_type_created_idx').on(table.expenseType, table.createdAt),
  }),
);

// 定义表之间的关系
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  userWorks: many(userWorks),
  creditIncome: many(userCreditIncome),
  creditExpense: many(userCreditExpense),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userUuid],
    references: [users.uuid],
  }),
}));

export const userWorksRelations = relations(userWorks, ({ one }) => ({
  user: one(users, {
    fields: [userWorks.userUuid],
    references: [users.uuid],
  }),
}));

export const userCreditIncomeRelations = relations(userCreditIncome, ({ one }) => ({
  user: one(users, {
    fields: [userCreditIncome.userUuid],
    references: [users.uuid],
  }),
}));

export const userCreditExpenseRelations = relations(userCreditExpense, ({ one, many }) => ({
  user: one(users, {
    fields: [userCreditExpense.userUuid],
    references: [users.uuid],
  }),
}));

// ============================================
// 游戏聚合站相关表 (GamesRamp)
// ============================================

// 游戏详情表
export const games = sqliteTable(
  'games',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    name: text('name').notNull(), // 游戏名称（默认语言，通常为英文）
    nameI18n: text('name_i18n', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'`), // 多语言游戏名称 JSON: {"en": "Super Mario", "zh": "超级马里奥"}
    slug: text('slug').notNull().unique(), // URL 后缀名
    status: text('status', { enum: ['draft', 'online', 'offline'] })
      .notNull()
      .default('draft'), // 游戏状态
    thumbnail: text('thumbnail').notNull(), // 缩略图 URL
    source: text('source').notNull(), // 游戏资源地址 URL
    interact: integer('interact').default(0), // 交互次数
    rating: real('rating').default(0), // 平均评分 (0-5)
    ratingCount: integer('rating_count').default(0), // 评分人数
    upvoteCount: integer('upvote_count').default(0), // 赞成数
    downvoteCount: integer('downvote_count').default(0), // 反对数
    saveCount: integer('save_count').default(0), // 收藏数
    shareCount: integer('share_count').default(0), // 分享数
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`), // 创建/发布时间
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'), // 软删除时间戳
  },
  (table) => ({
    uuidIdx: uniqueIndex('games_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('games_slug_idx').on(table.slug),
    statusIdx: index('games_status_idx').on(table.status),
    createdIdx: index('games_created_idx').on(table.createdAt),
    ratingIdx: index('games_rating_idx').on(table.rating),
    interactIdx: index('games_interact_idx').on(table.interact),
  }),
);

// 分类表
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    name: text('name').notNull(), // 分类名称
    slug: text('slug').notNull().unique(), // URL 后缀名
    iconUrl: text('icon_url'), // 分类图标 URL
    metadataTitle: text('metadata_title').notNull(), // SEO 元标题
    metadataDescription: text('metadata_description').notNull(), // SEO 元描述
    content: text('content'), // Markdown 格式的分类介绍（长文本，用于 SEO）
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('categories_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('categories_slug_idx').on(table.slug),
    nameIdx: index('categories_name_idx').on(table.name),
  }),
);

// 标签表
export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    name: text('name').notNull(), // 标签名称
    slug: text('slug').notNull().unique(), // URL 后缀名
    metadataTitle: text('metadata_title').notNull(), // SEO 元标题
    metadataDescription: text('metadata_description').notNull(), // SEO 元描述
    content: text('content'), // Markdown 格式的标签介绍（长文本，用于 SEO）
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('tags_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('tags_slug_idx').on(table.slug),
    nameIdx: index('tags_name_idx').on(table.name),
  }),
);

// 特性表（热门、新游戏、所有游戏等）
export const featured = sqliteTable(
  'featured',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    name: text('name').notNull(), // 特性名称，例如: Hot, New, AllGames
    slug: text('slug').notNull().unique(), // URL 后缀名
    metadataTitle: text('metadata_title').notNull(), // SEO 元标题
    metadataDescription: text('metadata_description').notNull(), // SEO 元描述
    content: text('content'), // Markdown 格式的特性介绍（长文本，用于 SEO）
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('featured_uuid_idx').on(table.uuid),
    slugIdx: uniqueIndex('featured_slug_idx').on(table.slug),
    nameIdx: index('featured_name_idx').on(table.name),
  }),
);

// 游戏介绍表（符合 SEO 实践的详细介绍）
export const introductions = sqliteTable(
  'introductions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    gameUuid: text('game_uuid').notNull(), // 关联游戏表
    metadataTitle: text('metadata_title').notNull(), // SEO 元标题
    metadataDescription: text('metadata_description').notNull(), // SEO 元描述
    content: text('content').notNull(), // Markdown 格式的游戏详情和玩法介绍（长文本）
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('introductions_uuid_idx').on(table.uuid),
    gameUuidIdx: uniqueIndex('introductions_game_uuid_idx').on(table.gameUuid), // 一个游戏对应一个介绍
  }),
);

// 评论表
export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    gameUuid: text('game_uuid').notNull(), // 关联游戏表
    userUuid: text('user_uuid'), // 关联用户表，可为空（匿名评论或 AI 生成）
    content: text('content').notNull(), // 评论内容
    status: text('status', { enum: ['pending', 'approved', 'rejected'] })
      .notNull()
      .default('pending'), // 审核状态

    // 匿名评论字段
    anonymousName: text('anonymous_name'), // 匿名用户名
    anonymousEmail: text('anonymous_email'), // 匿名邮箱
    source: text('source', { enum: ['user', 'anonymous', 'ai', 'admin'] })
      .notNull()
      .default('anonymous'), // 评论来源
    ipAddress: text('ip_address'), // IP 地址

    isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).default(false), // 是否 AI 生成（内部标记，不对外展示）
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('comments_uuid_idx').on(table.uuid),
    gameUuidIdx: index('comments_game_uuid_idx').on(table.gameUuid),
    userUuidIdx: index('comments_user_uuid_idx').on(table.userUuid),
    statusIdx: index('comments_status_idx').on(table.status),
    sourceIdx: index('comments_source_idx').on(table.source),
    gameStatusIdx: index('comments_game_status_idx').on(table.gameUuid, table.status),
    createdIdx: index('comments_created_idx').on(table.createdAt),
  }),
);

// 用户报告表（举报不当内容）
export const reports = sqliteTable(
  'reports',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    gameUuid: text('game_uuid').notNull(), // 关联游戏表
    userUuid: text('user_uuid'), // 关联用户表，可为空（匿名举报）
    content: text('content').notNull(), // 举报内容

    // 举报信息
    reportType: text('report_type').notNull(), // 举报类型: 'broken_game', 'inappropriate_content', etc.
    userName: text('user_name').notNull(), // 举报人姓名
    userEmail: text('user_email').notNull(), // 举报人邮箱

    // 处理状态
    status: text('status', { enum: ['pending', 'reviewed', 'resolved', 'rejected'] })
      .notNull()
      .default('pending'),
    adminNote: text('admin_note'), // 管理员备注
    processedAt: integer('processed_at'), // 处理时间
    processedBy: text('processed_by'), // 处理人 UUID

    ipAddress: text('ip_address'), // IP 地址
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('reports_uuid_idx').on(table.uuid),
    gameUuidIdx: index('reports_game_uuid_idx').on(table.gameUuid),
    userUuidIdx: index('reports_user_uuid_idx').on(table.userUuid),
    statusIdx: index('reports_status_idx').on(table.status),
    reportTypeIdx: index('reports_report_type_idx').on(table.reportType),
    createdIdx: index('reports_created_idx').on(table.createdAt),
  }),
);

// 游戏与分类关联表
export const gamesToCategories = sqliteTable(
  'games_to_categories',
  {
    gameUuid: text('game_uuid').notNull(),
    categoryUuid: text('category_uuid').notNull(),
    sortOrder: integer('sort_order').default(0), // 排序权重，越小越靠前
    createdAt: integer('created_at').default(0), // 关联创建时间，应用层设置
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameUuid, table.categoryUuid] }), // 复合主键
    gameIdx: index('games_to_categories_game_idx').on(table.gameUuid),
    categoryIdx: index('games_to_categories_category_idx').on(table.categoryUuid),
    sortIdx: index('games_to_categories_sort_idx').on(table.categoryUuid, table.sortOrder), // 排序索引
  }),
);

// 游戏与标签关联表
export const gamesToTags = sqliteTable(
  'games_to_tags',
  {
    gameUuid: text('game_uuid').notNull(),
    tagUuid: text('tag_uuid').notNull(),
    sortOrder: integer('sort_order').default(0), // 排序权重，越小越靠前
    createdAt: integer('created_at').default(0), // 关联创建时间，应用层设置
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameUuid, table.tagUuid] }), // 复合主键
    gameIdx: index('games_to_tags_game_idx').on(table.gameUuid),
    tagIdx: index('games_to_tags_tag_idx').on(table.tagUuid),
    sortIdx: index('games_to_tags_sort_idx').on(table.tagUuid, table.sortOrder), // 排序索引
  }),
);

// 游戏与特性关联表
export const gamesToFeatured = sqliteTable(
  'games_to_featured',
  {
    gameUuid: text('game_uuid').notNull(),
    featuredUuid: text('featured_uuid').notNull(),
    sortOrder: integer('sort_order').default(0), // 排序权重，越小越靠前
    createdAt: integer('created_at').default(0), // 关联创建时间，应用层设置
  },
  (table) => ({
    pk: primaryKey({ columns: [table.gameUuid, table.featuredUuid] }), // 复合主键
    gameIdx: index('games_to_featured_game_idx').on(table.gameUuid),
    featuredIdx: index('games_to_featured_featured_idx').on(table.featuredUuid),
    sortIdx: index('games_to_featured_sort_idx').on(table.featuredUuid, table.sortOrder), // 排序索引
  }),
);

// 游戏与评论关联表（冗余表，comments 表中已有 game_uuid，但按设计保留）
export const gamesToComments = sqliteTable(
  'games_to_comments',
  {
    gameUuid: text('game_uuid').notNull(),
    commentUuid: text('comment_uuid').notNull(),
  },
  (table) => ({
    pk: index('games_to_comments_pk').on(table.gameUuid, table.commentUuid), // 复合主键
    gameIdx: index('games_to_comments_game_idx').on(table.gameUuid),
    commentIdx: index('games_to_comments_comment_idx').on(table.commentUuid),
  }),
);

// 定义游戏聚合站表之间的关系
export const gamesRelations = relations(games, ({ many, one }) => ({
  categories: many(gamesToCategories),
  tags: many(gamesToTags),
  featured: many(gamesToFeatured),
  comments: many(comments),
  introduction: one(introductions, {
    fields: [games.uuid],
    references: [introductions.gameUuid],
  }),
  reports: many(reports),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  games: many(gamesToCategories),
  translations: many(categoryTranslations),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  games: many(gamesToTags),
  translations: many(tagTranslations),
}));

export const featuredRelations = relations(featured, ({ many }) => ({
  games: many(gamesToFeatured),
  translations: many(featuredTranslations),
}));

export const introductionsRelations = relations(introductions, ({ one, many }) => ({
  game: one(games, {
    fields: [introductions.gameUuid],
    references: [games.uuid],
  }),
  translations: many(introductionTranslations),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  game: one(games, {
    fields: [comments.gameUuid],
    references: [games.uuid],
  }),
  user: one(users, {
    fields: [comments.userUuid],
    references: [users.uuid],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  game: one(games, {
    fields: [reports.gameUuid],
    references: [games.uuid],
  }),
  user: one(users, {
    fields: [reports.userUuid],
    references: [users.uuid],
  }),
}));

export const gamesToCategoriesRelations = relations(gamesToCategories, ({ one }) => ({
  game: one(games, {
    fields: [gamesToCategories.gameUuid],
    references: [games.uuid],
  }),
  category: one(categories, {
    fields: [gamesToCategories.categoryUuid],
    references: [categories.uuid],
  }),
}));

export const gamesToTagsRelations = relations(gamesToTags, ({ one }) => ({
  game: one(games, {
    fields: [gamesToTags.gameUuid],
    references: [games.uuid],
  }),
  tag: one(tags, {
    fields: [gamesToTags.tagUuid],
    references: [tags.uuid],
  }),
}));

export const gamesToFeaturedRelations = relations(gamesToFeatured, ({ one }) => ({
  game: one(games, {
    fields: [gamesToFeatured.gameUuid],
    references: [games.uuid],
  }),
  featured: one(featured, {
    fields: [gamesToFeatured.featuredUuid],
    references: [featured.uuid],
  }),
}));

export const gamesToCommentsRelations = relations(gamesToComments, ({ one }) => ({
  game: one(games, {
    fields: [gamesToComments.gameUuid],
    references: [games.uuid],
  }),
  comment: one(comments, {
    fields: [gamesToComments.commentUuid],
    references: [comments.uuid],
  }),
}));

// ============================================
// 多语言翻译表
// ============================================

// 语言配置表（基础表）
export const languageConfig = sqliteTable(
  'language_config',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(), // 'zh', 'ja', 'es', 'ko' etc.
    nativeName: text('native_name').notNull(), // '简体中文', 'English', '日本語'
    chineseName: text('chinese_name').notNull(), // '简体中文', '英语', '日语'
    englishName: text('english_name').notNull(), // 'Simplified Chinese', 'English', 'Japanese'
    isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    codeIdx: uniqueIndex('language_config_code_idx').on(table.code),
    sortIdx: index('language_config_sort_idx').on(table.sortOrder),
    enabledIdx: index('language_config_enabled_idx').on(table.enabled),
  }),
);

// 分类翻译表
export const categoryTranslations = sqliteTable(
  'category_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryUuid: text('category_uuid').notNull(),
    locale: text('locale').notNull(), // 'zh', 'ja', 'es' 等（不包括默认语言 'en'）
    name: text('name').notNull(),
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'), // Markdown
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('category_translations_unique').on(table.categoryUuid, table.locale),
    categoryUuidIdx: index('category_translations_uuid_idx').on(table.categoryUuid),
    localeIdx: index('category_translations_locale_idx').on(table.locale),
  }),
);

// 标签翻译表
export const tagTranslations = sqliteTable(
  'tag_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tagUuid: text('tag_uuid').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'), // Markdown
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('tag_translations_unique').on(table.tagUuid, table.locale),
    tagUuidIdx: index('tag_translations_uuid_idx').on(table.tagUuid),
    localeIdx: index('tag_translations_locale_idx').on(table.locale),
  }),
);

// 特性翻译表
export const featuredTranslations = sqliteTable(
  'featured_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    featuredUuid: text('featured_uuid').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content'), // Markdown
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('featured_translations_unique').on(table.featuredUuid, table.locale),
    featuredUuidIdx: index('featured_translations_uuid_idx').on(table.featuredUuid),
    localeIdx: index('featured_translations_locale_idx').on(table.locale),
  }),
);

// 游戏介绍翻译表
export const introductionTranslations = sqliteTable(
  'introduction_translations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameUuid: text('game_uuid').notNull(),
    locale: text('locale').notNull(),
    metadataTitle: text('metadata_title').notNull(),
    metadataDescription: text('metadata_description').notNull(),
    content: text('content').notNull(), // Markdown
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex('introduction_translations_unique').on(table.gameUuid, table.locale),
    gameUuidIdx: index('introduction_translations_uuid_idx').on(table.gameUuid),
    localeIdx: index('introduction_translations_locale_idx').on(table.locale),
  }),
);

// 翻译任务表
export const translationTasks = sqliteTable(
  'translation_tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique(),
    languageCode: text('language_code').notNull(), // 'zh', 'ja' 等
    type: text('type', { enum: ['full', 'supplement'] }).notNull(), // 'full' | 'supplement'
    status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull(), // 'pending' | 'running' | 'completed' | 'failed'

    // 进度详情（JSON 格式）
    progress: text('progress', { mode: 'json' })
      .$type<{
        games: { done: number; total: number };
        categories: { done: number; total: number };
        tags: { done: number; total: number };
        featured: { done: number; total: number };
      }>()
      .default(
        sql`'{"games":{"done":0,"total":0},"categories":{"done":0,"total":0},"tags":{"done":0,"total":0},"featured":{"done":0,"total":0}}'`,
      ),

    // 错误信息（失败时）
    error: text('error'),

    // 时间戳
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    startedAt: integer('started_at'),
    completedAt: integer('completed_at'),
  },
  (table) => ({
    uuidIdx: uniqueIndex('translation_tasks_uuid_idx').on(table.uuid),
    languageCodeIdx: index('translation_tasks_language_code_idx').on(table.languageCode),
    statusIdx: index('translation_tasks_status_idx').on(table.status),
  }),
);

// 翻译表关系定义
export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryUuid],
    references: [categories.uuid],
  }),
}));

export const tagTranslationsRelations = relations(tagTranslations, ({ one }) => ({
  tag: one(tags, {
    fields: [tagTranslations.tagUuid],
    references: [tags.uuid],
  }),
}));

export const featuredTranslationsRelations = relations(featuredTranslations, ({ one }) => ({
  featured: one(featured, {
    fields: [featuredTranslations.featuredUuid],
    references: [featured.uuid],
  }),
}));

export const introductionTranslationsRelations = relations(introductionTranslations, ({ one }) => ({
  introduction: one(introductions, {
    fields: [introductionTranslations.gameUuid],
    references: [introductions.gameUuid],
  }),
}));
