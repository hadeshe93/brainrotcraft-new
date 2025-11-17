import type { Hero } from '@/types/blocks/hero';
import type { Features } from '@/types/blocks/features';
import type { Statistics } from '@/types/blocks/statistics';
import type { FAQ } from '@/types/blocks/faq';
import type { Steps } from '@/types/blocks/steps';
import type { Pricing } from '@/types/blocks/pricing';
import type { Showcase } from '@/types/blocks/showcase';
import type { CompareShowcase } from '@/types/blocks/compare-showcase';
import type { CTA } from '@/types/blocks/cta';
import type { Comparison } from '@/types/blocks/comparison';
import type { HowItWorks } from '@/types/blocks/how-it-works';
import type { UseCases } from '@/types/blocks/use-cases';
import type { ServiceErrorCode } from '@/types/services/errors';
import type { PaymentSuccess, PaymentCancel } from '@/types/blocks/payment';
import { createTranslator, NamespaceKeys, NestedKeyOf } from 'next-intl';
import type { Feedback } from '@/types/blocks/feedback';
import type { Changelog } from '@/types/blocks/changelog';
import type { Introduction } from '@/types/blocks/introduction';
import type { Metadata } from '@/types/blocks/metadata';
import type { Header } from '@/types/blocks/header';
import type { Footer } from '@/types/blocks/footer';
import type { Image } from '@/types/blocks/base';
import type { Embed } from '@/types/blocks/embed';
import type { MarqueePortrait } from '@/types/blocks/marquee';
import type { MarkdownRenderer } from '@/types/blocks/markdown-renderer';
import type { Breadcrumb } from '@/types/blocks/breadcrumb';
import type { AboutBlockSection } from '@/types/blocks/about';

// 使用 next-intl 提供的 NamespaceKeys 类型，它已经支持嵌套路径
export type I18nTranslator<TNameSpace extends NamespaceKeys<I18nMessageContent, NestedKeyOf<I18nMessageContent>>> =
  ReturnType<typeof createTranslator<I18nMessageContent, TNameSpace>>;

type Langdingpage = {
  embed?: Embed;
  hero?: Hero;
  features?: Features;
  seniorFeatures?: Features;
  marqueePortrait?: MarqueePortrait;
  steps?: Steps;
  statistics?: Statistics;
  showcase?: Showcase;
  compareShowcase?: CompareShowcase;
  faq?: FAQ;
  pricing?: Pricing;
  comparison?: Comparison;
  howItWorks?: HowItWorks;
  useCases?: UseCases;
  cta?: CTA;
  briefMarkdownRenderer?: MarkdownRenderer;
  markdownRenderer?: MarkdownRenderer;
};

export interface ImageFilterStyle {
  id: string;
  disabled?: boolean;
  title: string;
  description: string;
  preview_image: Image;
}
/**
 * 页面内容多语言类型
 */
export type I18nPageContent = {
  layout: {
    metadata: Metadata;
    header: Header;
    footer: Footer;
  };
  home: Langdingpage;
  pricing?: {
    metadata: Metadata;
    breadcrumb?: Breadcrumb;
    pricing: Pricing;
    faq?: FAQ;
    markdownRenderer?: MarkdownRenderer;
  };
  feedback?: {
    metadata: Metadata;
    introduction: Introduction;
    feedback: Feedback;
    breadcrumb?: Breadcrumb;
  };
  changelog?: {
    metadata: Metadata;
    introduction: Introduction;
    changelog: Changelog;
    breadcrumb?: Breadcrumb;
  };
  dmca?: {
    metadata: Metadata;
    content: string;
    breadcrumb?: Breadcrumb;
  };
  privacy?: {
    metadata: Metadata;
    content: string;
    breadcrumb?: Breadcrumb;
  };
  terms?: {
    metadata: Metadata;
    content: string;
    breadcrumb?: Breadcrumb;
  };
  about?: {
    metadata: Metadata;
    content: AboutBlockSection;
    breadcrumb?: Breadcrumb;
  };
  userProfile?: {
    metadata: Metadata & {
      defaultTitle: string;
      defaultDescription: string;
    };
    generating: string;
    generation_failed: string;
  };
  paymentSuccess?: {
    metadata: Metadata;
    content: PaymentSuccess;
  };
  paymentCancel?: {
    metadata: Metadata;
    content: PaymentCancel;
  };
};
export type I18nPageContentKey = keyof I18nPageContent;

/**
 * 通用组件多语言类型
 */
export type I18nMessageContent = {
  user: {
    sign_in: string;
    sign_out: string;
    credits: string;
    dashboard: string;
    my_works: string;
    my_orders: string;
    my_credits: string;
  };
  user_convertion: {
    free_quota_used_up: string;
    run_out_credits: string;
    exceed_max_bulk_upload_count: string;
    buy_credits_to_upgrade_max_bulk_upload_count: string;
    sign_in_to_get_more_quota: string;
    buy_credits_to_get_more_usage: string;
  };
  common: {
    congratulations: string;
    note: string;
    attention: string;
    loading: string;
    close: string;
    submit: string;
    submitting: string;
    free_quota_used_up: string;
    curve_arrow_to_up: Image;
    rotated_right_arrow: Image;
    showing_items: string;
    pagination: {
      aria_label: string;
      previous: string;
      next: string;
      page: string;
    };
  };
  subscription: {
    current_plan: string;
    free: string;
    upgrade_to_pro: string;
    already_subscribed_the_plan: string;
    already_subscribed_other_plan: string;
    or_subscribe_to_unlock_usage_restrictions: string;
    buy_credits_to_get_more_usage: string;
  };
  credits: {
    title: string;
    balance: string;
    available: string;
    used: string;
    pending: string;
    history: string;
    buy_more: string;
    insufficient: string;
    required: string;
    current_cycle: string;
    expires_on: string;
    transaction_history: string;
    no_history: string;
    consumed_for: string;
    refunded: string;
    loading: string;
    error: string;
    available_format: string;
    pending_format: string;
    // credits-grid.tsx component fields
    not_subscribed_title: string;
    not_subscribed_description: string;
    upgrade_to_pro: string;
    load_error_title: string;
    load_error_description: string;
    no_data_title: string;
    no_data_description: string;
    available_credits: string;
    out_of_total: string;
    used_credits: string;
    usage_percentage: string;
    pending_credits: string;
    pending_tasks: string;
    subscription_cycle: string;
    cycle_start: string;
    cycle_end: string;
    days_remaining: string;
    days: string;
    usage_history: string;
    history_description: string;
    no_usage_history: string;
    credits: string;
    load_more: string;
    workId: string;
    outputId: string;
    expense_type: {
      generate_work: string;
      premium_feature: string;
      admin_deduct: string;
    };
    // 永久积分相关翻译
    total_available_credits: string;
    subscription_credits: string;
    permanent_credits: string;
    subscription_credits_description: string;
    permanent_credits_description: string;
    total_credits_summary: string;
    from_subscription: string;
    from_permanent: string;
  };
  pricing: {
    selected_credits: string;
    cost_per_image: string;
  };
  sign_modal: {
    sign_in_title: string;
    sign_in_description: string;
    sign_in_success_and_more_quota: string;
    sign_in_to_get_more_quota: string;
    or_sign_in_to_more_trials: string;
    sign_up_title: string;
    sign_up_description: string;
    email_title: string;
    email_placeholder: string;
    password_title: string;
    password_placeholder: string;
    forgot_password: string;
    or: string;
    continue: string;
    no_account: string;
    email_sign_in: string;
    google_sign_in: string;
    github_sign_in: string;
    close_title: string;
    cancel_title: string;
  };
  turnstile: {
    title: string;
    description: string;
    loadingVerification: string;
    protectedByCloudflareTurnstile: string;
    anotherVerificationInProgress: string;
    sitekeyRequired: string;
    containerNotFound: string;
    verificationLoadFailed: string;
    verificationFailed: string;
    userCancelledVerification: string;
    verificationComponentNotReady: string;
  };
  error: Record<ServiceErrorCode, string>;
  prediction: {
    starting: string;
    processing: string;
    queuing: string;
    failed: string;
    canceled: string;
  };
  share: {
    text: {
      link: string;
      twitter: string;
      facebook: string;
      telegram: string;
      line: string;
      linkedin: string;
      tumblr: string;
      reddit: string;
    };
  };
  stripe: {
    climate: {
      badge_description: string;
    };
  };
  feedback: {
    name: string;
    email: string;
    message: string;
    submit: string;
    securityCheck: string;
    errorRequiredName: string;
    errorRequiredEmail: string;
    errorRequiredMessage: string;
    errorRequiredCfTurnstileToken: string;
    successfulSubmit: string;
    failedSubmit: string;
  };
  showcase: {
    view_large_image: string;
    close_large_image: string;
    pro_label: string;
    fast_label: string;
    pro_quality: string;
    speed_mode: string;
  };
  mockups: {
    notice_title: string;
    notice_description: string;
    notice_description_detailed: string;
    poster: string;
    poster_handle: string;
    post_content: string;
    post_timestamp: string;
  };
  user_profile: {
    work_id: string;
    works_count: string;
    followers_count: string;
    joined_date: string;
    load_more: string;
    no_works: string;
    no_works_description: string;
    work_details: string;
    created_at: string;
    downloads_count: string;
    likes_count: string;
    download_image: string;
    close_modal: string;
    user_not_found: string;
    user_not_found_description: string;
    loading_user: string;
    loading_works: string;
    // Order related fields
    orders_count: string;
    no_orders: string;
    no_orders_description: string;
    loading_orders: string;
    order_details: string;
    order_status: string;
    order_amount: string;
    payment_method: string;
    order_date: string;
    credits: string;
    payment_time: string;
    failed_to_load_more_orders: string;
    retry: string;
    // Order status values
    order_status_paid: string;
    order_status_pending: string;
    order_status_failed: string;
    order_status_refunded: string;
    order_status_cancelled: string;
    // Order detail modal specific
    order_number: string;
    status: string;
    product_details: string;
    product: string;
    price: string;
    payment_information: string;
    transaction_id: string;
    subscription_details: string;
    cycle: string;
    start_time: string;
    end_time: string;
    order_timeline: string;
    order_created: string;
    payment_completed: string;
    refund_processed: string;
    last_updated: string;
    notes: string;
    order_summary: string;
    order_id: string;
    product_id: string;
    total_amount: string;
    amount: string;
  };
  // 表单
  form: {
    drag_and_drop_files_here: string;
    or_click_to_browse: string;
    max_files: string;
    max_size: string;
    file_been_rejected: string;
    browse_files: string;
    upload_image: string;
    or_drop_file: string;
    paste_image_or_url: string;
    url: string;
    only_image_files_allowed: string;
    file_size_must_be_less_than: string;
    file_count_must_be_less_than: string;
    submit_button_title: string;
    generating: string;
    regenerate: string;
    retry: string;
    download: string;
    estimated_time: string;
    results: string;
    design_settings: string;
    generated_works: string;
    no_works_generated: string;
    no_works_generated_description: string;
    error: string;
    generation_failed: string;
    requires_sign_in: string;
    premium_capability_requires_sign_in: string;
    capability_restricted: string;
    unlock_premium_capability: string;
    unlock_usage_frequency_restrictions: string;
    premium_capability_requires_subscription: string;
    no_thanks: string;
    security_check_title: string;
    explanation_for_security_check: string;
  };
  // === Cross-domain Reusable Components ===
  comment: {
    form: {
      heading: string;
      name_label: string;
      name_placeholder: string;
      email_label: string;
      email_placeholder: string;
      email_helper: string;
      content_label: string;
      content_placeholder: string;
      character_count: string;
      error_required: string;
      error_verification: string;
      error_submit_failed: string;
      error_generic: string;
      success: string;
      button_submitting: string;
      button_submit: string;
    };
    list: {
      empty_state: string;
      heading: string;
    };
  };
  report: {
    dialog: {
      title: string;
      description: string;
      type_label: string;
      type_placeholder: string;
      types: {
        copyright: string;
        inappropriate: string;
        broken: string;
        misleading: string;
        malware: string;
        other: string;
      };
      name_label: string;
      name_placeholder: string;
      email_label: string;
      email_placeholder: string;
      email_helper: string;
      description_label: string;
      description_placeholder: string;
      character_count: string;
      error_required: string;
      error_verification: string;
      error_submit_failed: string;
      error_generic: string;
      success: string;
      button_cancel: string;
      button_submitting: string;
      button_submit: string;
    };
  };
  // 业务
  biz: {
    share: {
      title_home: string;
    };
    cta: {
      cta_try_biz: string;
      cta_try_slogan: string;
    };
    form: {
      image_required: string;
      image_max_size_exceeded: string;
    };
    game: {
      // Section titles
      hot_games: string;
      new_games: string;
      all_games: string;
      similar_games: string;
      // Links
      more_hot_games: string;
      more_new_games: string;
      // Types for showing_items pattern
      type_games: string;
      // Game actions
      upvote: string;
      downvote: string;
      save: string;
      share: string;
      report: string;
      share_text: string;
      link_copied: string;
      // Fullscreen
      fullscreen_enter: string;
      fullscreen_exit: string;
    };
    category: {
      all_categories: string;
      browse_all: string;
      type_categories: string;
    };
    tag: {
      all_tags: string;
      browse_all: string;
      type_tags: string;
    };
  };
};
