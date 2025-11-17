# C-End Pages Hardcoded English Text Audit

**Date**: 2025-11-14
**Scope**: Client-facing pages under `src/app/[locale]/`
**Purpose**: Identify all hardcoded English text that needs i18n support

---

## Executive Summary

This audit identifies **10 C-end pages** requiring i18n work and **8 shared components** with hardcoded English text totaling **~100+ strings**.

### Pages Already i18n-Ready (No Action Needed)
✅ `/feedback`, `/about`, `/changelog`, `/dmca`, `/payment/cancel`, `/payment/success`, `/pricing`, `/privacy`, `/terms`, `/user/[userId]`

These pages use the `getPageContent` i18n pattern and are already properly internationalized.

---

## Translation Strategy

### 1. Fallback Text → Empty String
All fallback text (metadata, error states, development mode) should be replaced with empty strings.

### 2. UI Text → i18n Messages
- **Business-specific text** → `biz.*` namespace (max 3 levels)
- **Cross-domain reusable components** → Top-level namespace (e.g., `comment.*`, `report.*`)
- **Common patterns** → `common.*` namespace

### 3. Key Design Principles
- **Max 3 levels**: `namespace.category.key`
- **Content-based, not location-based**: Organize by what it is, not where it's used
- **Reusable**: Keys should be usable across multiple pages/contexts

### 4. Implementation Method
Use `useTranslations` hook (client components) or `getTranslations` (server components/metadata):
```typescript
// Client component example
const t = useTranslations('comment.form');
return <h3>{t('heading')}</h3>;

// Server component/metadata example
const t = await getTranslations('biz.game');
return <h1>{t('hot_games')}</h1>;
```

---

## Proposed Translation Structure

```typescript
// src/i18n/messages/en/index.ts
const MESSAGES = {
  // ... existing content ...

  // === Cross-domain Reusable Components ===
  comment: {
    form: {
      heading: 'Leave a Comment',
      name_label: 'Name',
      name_placeholder: 'Your name',
      email_label: 'Email',
      email_placeholder: 'your@email.com',
      email_helper: 'Your email will not be published',
      content_label: 'Comment',
      content_placeholder: 'Write your comment here...',
      character_count: '{current}/500 characters',
      error_required: 'All fields are required',
      error_verification: 'Please complete the verification',
      error_submit_failed: 'Failed to submit comment',
      error_generic: 'An error occurred. Please try again.',
      success: 'Comment submitted successfully! It will be reviewed before appearing publicly.',
      button_submitting: 'Submitting...',
      button_submit: 'Send Comment',
    },
    list: {
      empty_state: 'No comments yet. Be the first to comment!',
      heading: 'Comments',
    },
  },

  report: {
    dialog: {
      title: 'Report Game',
      description: 'Report an issue with',
      type_label: 'Report Type',
      type_placeholder: 'Select a report type',
      types: {
        copyright: 'Copyright Violation',
        inappropriate: 'Inappropriate Content',
        broken: 'Broken Game',
        misleading: 'Misleading Information',
        malware: 'Malware/Security Issue',
        other: 'Other',
      },
      name_label: 'Your Name',
      name_placeholder: 'Your name',
      email_label: 'Your Email',
      email_placeholder: 'your@email.com',
      email_helper: 'We may contact you for more information',
      description_label: 'Description',
      description_placeholder: 'Describe the issue in detail...',
      character_count: '{current}/1000 characters',
      error_required: 'All fields are required',
      error_verification: 'Please complete the verification',
      error_submit_failed: 'Failed to submit report',
      error_generic: 'An error occurred. Please try again.',
      success: 'Report submitted successfully! Our team will review it shortly.',
      button_cancel: 'Cancel',
      button_submitting: 'Submitting...',
      button_submit: 'Submit Report',
    },
  },

  // === Common Patterns (Cross-page Reuse) ===
  common: {
    // ... existing ...
    showing_items: 'Showing {current} of {total} {type}',
    pagination: {
      aria_label: 'Pagination',
      previous: 'Previous page',
      next: 'Next page',
      page: 'Page {number}',
    },
  },

  // === Business-Specific Content ===
  biz: {
    // ... existing ...

    // Game-related content (reusable across pages)
    game: {
      // Section titles
      hot_games: 'Hot Games',
      new_games: 'New Games',
      all_games: 'All Games',
      similar_games: 'Similar Games',

      // Links
      more_hot_games: 'More Hot Games',
      more_new_games: 'More New Games',

      // Types for showing_items pattern
      type_games: 'games',

      // Game actions
      upvote: 'Upvote',
      downvote: 'Downvote',
      save: 'Save',
      share: 'Share',
      report: 'Report',
      share_text: 'Play {name} on GamesRamp',
      link_copied: 'Link copied to clipboard!',

      // Fullscreen
      fullscreen_enter: 'Enter fullscreen',
      fullscreen_exit: 'Exit fullscreen',
    },

    // Category-related content (reusable)
    category: {
      all_categories: 'All Categories',
      browse_all: 'Browse all {count} game categories',
      type_categories: 'game categories',
    },

    // Tag-related content (reusable)
    tag: {
      all_tags: 'All Tags',
      browse_all: 'Browse all {count} game tags',
      type_tags: 'game tags',
    },
  },
};
```

---

## Pages Requiring i18n Work

### 1. Home Page (`/page.tsx`)

**File**: `src/app/[locale]/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 35 | Fallback | `'Online Games at GamesRamp'` | - | Replace with `''` |
| 37 | Fallback | `'Welcome to GamesRamp! Database is not available...'` | - | Replace with `''` |
| 53 | UI Text | `"Hot Games"` | `biz.game.hot_games` | Extract to i18n |
| 57 | UI Text | `'More Hot Games'` | `biz.game.more_hot_games` | Extract to i18n |
| 65 | UI Text | `"New Games"` | `biz.game.new_games` | Extract to i18n |
| 69 | UI Text | `'More New Games'` | `biz.game.more_new_games` | Extract to i18n |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
// Line 53: title={t('hot_games')}
// Line 57: text: t('more_hot_games')
// Line 65: title={t('new_games')}
// Line 69: text: t('more_new_games')
```

---

### 2. Game Detail Page (`/game/[slug]/page.tsx`)

**File**: `src/app/[locale]/game/[slug]/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 130 | Metadata | `'Game Not Found'` | - | Replace with `''` |
| 140 | Metadata | `` `Play ${game.name} online for free...` `` | - | Replace with `''` |

**Note**: This page uses `CommentForm`, `CommentList`, `GameEmbed`, `SimilarGames`, and `GameActions` components - all need separate i18n work (see Components section).

---

### 3. All Games Page (`/games/page.tsx`)

**File**: `src/app/[locale]/games/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 41 | UI Text | `"All Games"` | `biz.game.all_games` | Extract to i18n |
| 44 | UI Text | `` `Showing ${gamesData.games.length} of ${gamesData.pagination.totalItems} games` `` | `common.showing_items` | Use pattern with params |
| 77 | Metadata | `'All Games'` | - | Replace with `''` |
| 78 | Metadata | `'Browse all available online games.'` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
const tCommon = useTranslations('common');

// Line 41: <h1>{t('all_games')}</h1>
// Line 44:
tCommon('showing_items', {
  current: gamesData.games.length,
  total: gamesData.pagination.totalItems,
  type: t('type_games')  // 'games'
})
```

---

### 4. Hot Games Page (`/hot/page.tsx`)

**File**: `src/app/[locale]/hot/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 43 | UI Text | `"Hot Games"` | `biz.game.hot_games` | Extract to i18n |
| 49 | UI Text | `` `Showing ${games.length} of ${pagination.totalItems} games` `` | `common.showing_items` | Use pattern |
| 82 | Metadata | `'Hot Games'` | - | Replace with `''` |
| 83 | Metadata | `'Discover the most popular and trending games.'` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
const tCommon = useTranslations('common');

// Line 43: <h1>{t('hot_games')}</h1>
// Line 49: tCommon('showing_items', { current, total, type: t('type_games') })
```

---

### 5. New Games Page (`/new/page.tsx`)

**File**: `src/app/[locale]/new/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 43 | UI Text | `"New Games"` | `biz.game.new_games` | Extract to i18n |
| 49 | UI Text | `` `Showing ${games.length} of ${pagination.totalItems} games` `` | `common.showing_items` | Use pattern |
| 82 | Metadata | `'New Games'` | - | Replace with `''` |
| 83 | Metadata | `'Check out the latest games added to our collection.'` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
const tCommon = useTranslations('common');

// Line 43: <h1>{t('new_games')}</h1>
// Line 49: tCommon('showing_items', { current, total, type: t('type_games') })
```

---

### 6. All Categories Page (`/categories/page.tsx`)

**File**: `src/app/[locale]/categories/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 34 | UI Text | `"All Categories"` | `biz.category.all_categories` | Extract to i18n |
| 35 | UI Text | `` `Browse all ${categories.length} game categories` `` | `biz.category.browse_all` | Extract with param |
| 61 | Metadata | `'All Categories'` | - | Replace with `''` |
| 62 | Metadata | `'Browse all game categories.'` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.category');
// Line 34: <h1>{t('all_categories')}</h1>
// Line 35: <p>{t('browse_all', { count: categories.length })}</p>
```

---

### 7. Category Detail Page (`/category/[slug]/page.tsx`)

**File**: `src/app/[locale]/category/[slug]/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 54 | UI Text | `` `Showing ${games.length} of ${pagination.totalItems} games` `` | `common.showing_items` | Use pattern |
| 90 | Metadata | `'Category Not Found'` | - | Replace with `''` |
| 98 | Metadata | `` `Browse ${category.name} games.` `` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
const tCommon = useTranslations('common');

// Line 54: tCommon('showing_items', { current, total, type: t('type_games') })
```

---

### 8. All Tags Page (`/tags/page.tsx`)

**File**: `src/app/[locale]/tags/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 34 | UI Text | `"All Tags"` | `biz.tag.all_tags` | Extract to i18n |
| 35 | UI Text | `` `Browse all ${tags.length} game tags` `` | `biz.tag.browse_all` | Extract with param |
| 61 | Metadata | `'All Tags'` | - | Replace with `''` |
| 62 | Metadata | `'Browse all game tags.'` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.tag');
// Line 34: <h1>{t('all_tags')}</h1>
// Line 35: <p>{t('browse_all', { count: tags.length })}</p>
```

---

### 9. Tag Detail Page (`/tag/[slug]/page.tsx`)

**File**: `src/app/[locale]/tag/[slug]/page.tsx`

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 54 | UI Text | `` `Showing ${games.length} of ${pagination.totalItems} games` `` | `common.showing_items` | Use pattern |
| 90 | Metadata | `'Tag Not Found'` | - | Replace with `''` |
| 98 | Metadata | `` `Browse ${tag.name} games.` `` | - | Replace with `''` |

**Implementation**:
```typescript
const t = useTranslations('biz.game');
const tCommon = useTranslations('common');

// Line 54: tCommon('showing_items', { current, total, type: t('type_games') })
```

---

## Components Requiring i18n Work

### 1. CommentForm Component 🔴 HIGH PRIORITY

**File**: `src/components/comment/form.tsx`

**String Count**: 15 strings

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 78 | UI Text | `"Leave a Comment"` | `comment.form.heading` |
| 82 | UI Text | `"Name"` | `comment.form.name_label` |
| 86 | UI Text | `"Your name"` | `comment.form.name_placeholder` |
| 96 | UI Text | `"Email"` | `comment.form.email_label` |
| 100 | UI Text | `"your@email.com"` | `comment.form.email_placeholder` |
| 105 | UI Text | `"Your email will not be published"` | `comment.form.email_helper` |
| 110 | UI Text | `"Comment"` | `comment.form.content_label` |
| 113 | UI Text | `"Write your comment here..."` | `comment.form.content_placeholder` |
| 121 | UI Text | `{content.length}/500 characters` | `comment.form.character_count` |
| 33 | Error | `'All fields are required'` | `comment.form.error_required` |
| 38 | Error | `'Please complete the verification'` | `comment.form.error_verification` |
| 67 | Error | `'Failed to submit comment'` | `comment.form.error_submit_failed` |
| 70 | Error | `'An error occurred. Please try again.'` | `comment.form.error_generic` |
| 144 | Success | `'Comment submitted successfully!...'` | `comment.form.success` |
| 150 | Button | `'Submitting...' : 'Send Comment'` | `comment.form.button_submitting/submit` |

**Implementation**:
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function CommentForm({ gameUuid, onSuccess, className }: CommentFormProps) {
  const t = useTranslations('comment.form');

  return (
    <form>
      <h3>{t('heading')}</h3>
      <Label>{t('name_label')}</Label>
      <Input placeholder={t('name_placeholder')} />
      {/* ... */}
      <p>{t('character_count', { current: content.length })}</p>
      <Button>{isSubmitting ? t('button_submitting') : t('button_submit')}</Button>
    </form>
  );
}
```

---

### 2. CommentList Component

**File**: `src/components/comment/list.tsx`

**String Count**: 2 strings

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 21 | UI Text | `"No comments yet. Be the first to comment!"` | `comment.list.empty_state` |
| 30 | UI Text | `"Comments"` | `comment.list.heading` |

**Implementation**:
```typescript
import { useTranslations } from 'next-intl';

export default function CommentList({ comments, totalCount }: CommentListProps) {
  const t = useTranslations('comment.list');

  if (!comments || comments.length === 0) {
    return <p>{t('empty_state')}</p>;
  }

  return (
    <div>
      <h3>{t('heading')} ({totalCount})</h3>
      {/* ... */}
    </div>
  );
}
```

---

### 3. ReportDialog Component 🔴 HIGH PRIORITY

**File**: `src/components/report/dialog.tsx`

**String Count**: 25+ strings

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 28-34 | Options | Report type labels | `report.dialog.types.*` |
| 117 | UI Text | `"Report Game"` | `report.dialog.title` |
| 119 | UI Text | `"Report an issue with"` | `report.dialog.description` |
| 126 | UI Text | `"Report Type"` | `report.dialog.type_label` |
| 129 | UI Text | `"Select a report type"` | `report.dialog.type_placeholder` |
| 143 | UI Text | `"Your Name"` | `report.dialog.name_label` |
| 147 | UI Text | `"Your name"` | `report.dialog.name_placeholder` |
| 157 | UI Text | `"Your Email"` | `report.dialog.email_label` |
| 161 | UI Text | `"your@email.com"` | `report.dialog.email_placeholder` |
| 166 | UI Text | `"We may contact you for more information"` | `report.dialog.email_helper` |
| 171 | UI Text | `"Description"` | `report.dialog.description_label` |
| 174 | UI Text | `"Describe the issue in detail..."` | `report.dialog.description_placeholder` |
| 182 | UI Text | `{content.length}/1000 characters` | `report.dialog.character_count` |
| 71 | Error | `'All fields are required'` | `report.dialog.error_required` |
| 76 | Error | `'Please complete the verification'` | `report.dialog.error_verification` |
| 103 | Error | `'Failed to submit report'` | `report.dialog.error_submit_failed` |
| 106 | Error | `'An error occurred. Please try again.'` | `report.dialog.error_generic` |
| 205 | Success | `'Report submitted successfully!...'` | `report.dialog.success` |
| 218 | Button | `"Cancel"` | `report.dialog.button_cancel` |
| 221 | Button | `'Submitting...' : 'Submit Report'` | `report.dialog.button_submitting/submit` |

**Implementation**:
```typescript
'use client';
import { useTranslations } from 'next-intl';

const REPORT_TYPES = [
  { value: 'copyright', labelKey: 'copyright' },
  { value: 'inappropriate', labelKey: 'inappropriate' },
  // ... etc
];

export default function ReportDialog({ gameUuid, gameName }: ReportDialogProps) {
  const t = useTranslations('report.dialog');

  return (
    <Dialog>
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogDescription>{t('description')} <span>{gameName}</span></DialogDescription>

      <Select>
        <SelectValue placeholder={t('type_placeholder')} />
        <SelectContent>
          {REPORT_TYPES.map((type) => (
            <SelectItem value={type.value}>
              {t(`types.${type.labelKey}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* ... */}
    </Dialog>
  );
}
```

---

### 4. GameActions Component

**File**: `src/components/game/actions.tsx`

**String Count**: 8 strings

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 129 | Share | `` `Play ${gameName} on GamesRamp` `` | `biz.game.share_text` |
| 141 | Alert | `'Link copied to clipboard!'` | `biz.game.link_copied` |
| 158 | Accessibility | `"Upvote"` | `biz.game.upvote` |
| 176 | Accessibility | `"Downvote"` | `biz.game.downvote` |
| 191 | Accessibility | `"Save"` | `biz.game.save` |
| 206 | Accessibility | `"Share"` | `biz.game.share` |
| 221 | Accessibility | `"Report"` | `biz.game.report` |
| 225 | UI Text | `"Report"` | `biz.game.report` |

**Implementation**:
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function GameActions({ gameUuid, gameName }: GameActionsProps) {
  const t = useTranslations('biz.game');

  const handleShare = async () => {
    await navigator.share({
      title: gameName,
      text: t('share_text', { name: gameName }),
      url: shareUrl,
    });
    // Fallback:
    alert(t('link_copied'));
  };

  return (
    <div>
      <Button aria-label={t('upvote')}>...</Button>
      <span>{t('report')}</span>
    </div>
  );
}
```

---

### 5. SimilarGames Component

**File**: `src/components/game/similar.tsx`

**String Count**: 2 strings

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 28 | UI Text | `"Similar Games"` | `biz.game.similar_games` |
| 30 | UI Text | `"More New Games →"` | `biz.game.more_new_games` |

**Implementation**:
```typescript
import { useTranslations } from 'next-intl';

export default function SimilarGames({ games }: SimilarGamesProps) {
  const t = useTranslations('biz.game');

  return (
    <section>
      <h2>{t('similar_games')}</h2>
      <Link href="/games">{t('more_new_games')}</Link>
    </section>
  );
}
```

---

### 6. GameEmbed Component

**File**: `src/components/game/embed.tsx`

**String Count**: 2 aria-labels

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 101 | Accessibility | `'Exit fullscreen' : 'Enter fullscreen'` | `biz.game.fullscreen_exit/enter` |

**Implementation**:
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function GameEmbed({ gameUuid, gameName, gameUrl }: GameEmbedProps) {
  const t = useTranslations('biz.game');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Button aria-label={isFullscreen ? t('fullscreen_exit') : t('fullscreen_enter')}>
      {/* ... */}
    </Button>
  );
}
```

---

### 7. Pagination Component

**File**: `src/components/ui/pagination.tsx`

**String Count**: 4 aria-labels

| Line | Type | Current Text | Target Key |
|------|------|-------------|------------|
| 70 | Accessibility | `"Pagination"` | `common.pagination.aria_label` |
| 77 | Accessibility | `"Previous page"` | `common.pagination.previous` |
| 102 | Accessibility | `` `Page ${pageNumber}` `` | `common.pagination.page` |
| 117 | Accessibility | `"Next page"` | `common.pagination.next` |

**Implementation**:
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const t = useTranslations('common.pagination');

  return (
    <nav aria-label={t('aria_label')}>
      <Button aria-label={t('previous')}>...</Button>
      <Button aria-label={t('page', { number: pageNumber })}>...</Button>
      <Button aria-label={t('next')}>...</Button>
    </nav>
  );
}
```

---

### 8. GameSection Component

**File**: `src/components/game/section.tsx`

**String Count**: 1 fallback string

| Line | Type | Current Text | Target Key | Action |
|------|------|-------------|------------|--------|
| 27 | Fallback | `'More'` | - | Replace with `''` |

**Note**: Title is passed as prop from parent pages (already covered in page i18n work).

---

## Implementation Checklist

### Phase 1: Update Translation Files
- [ ] Add all new keys to `src/i18n/messages/en/index.ts`
- [ ] Verify TypeScript types are correct
- [ ] Create `src/i18n/messages/zh/index.ts` for Chinese (when ready)

### Phase 2: Update Pages (10 pages)
- [ ] Home page (`/page.tsx`)
- [ ] Game detail page (`/game/[slug]/page.tsx`)
- [ ] All games page (`/games/page.tsx`)
- [ ] Hot games page (`/hot/page.tsx`)
- [ ] New games page (`/new/page.tsx`)
- [ ] All categories page (`/categories/page.tsx`)
- [ ] Category detail page (`/category/[slug]/page.tsx`)
- [ ] All tags page (`/tags/page.tsx`)
- [ ] Tag detail page (`/tag/[slug]/page.tsx`)
- [ ] Replace all fallback strings with `''`

### Phase 3: Update Components (8 components)
- [ ] CommentForm (`src/components/comment/form.tsx`)
- [ ] CommentList (`src/components/comment/list.tsx`)
- [ ] ReportDialog (`src/components/report/dialog.tsx`)
- [ ] GameActions (`src/components/game/actions.tsx`)
- [ ] SimilarGames (`src/components/game/similar.tsx`)
- [ ] GameEmbed (`src/components/game/embed.tsx`)
- [ ] Pagination (`src/components/ui/pagination.tsx`)
- [ ] GameSection (`src/components/game/section.tsx`)

### Phase 4: Testing
- [ ] Test all pages in English locale
- [ ] Test all pages in Chinese locale (after translation)
- [ ] Verify fallback behavior (empty strings)
- [ ] Test accessibility labels with screen readers
- [ ] Verify character counters work with i18n
- [ ] Test "Showing X of Y" pattern across all list pages

---

## Key Design Summary

### Translation Namespaces (Max 3 Levels)

```
comment.form.*          - Comment form strings (15 keys)
comment.list.*          - Comment list strings (2 keys)
report.dialog.*         - Report dialog strings (25+ keys)
common.showing_items    - Universal "Showing X of Y" pattern
common.pagination.*     - Pagination aria-labels (4 keys)

biz.game.*              - Game content (titles, actions, fullscreen, share)
biz.category.*          - Category content (titles, browse text)
biz.tag.*               - Tag content (titles, browse text)
```

### Key Reusability Examples

- `biz.game.hot_games` - Used in home page, hot page, anywhere showing hot games
- `biz.game.new_games` - Used in home page, new page, similar games link
- `biz.game.type_games` - Used with `common.showing_items` across all game list pages
- `biz.game.report` - Used in GameActions component across all game pages
- `common.showing_items` - Used in 7+ list pages with different types

---

## Summary Statistics

- **Total Pages Requiring Work**: 10
- **Pages Already i18n-Ready**: 10
- **Components Requiring Work**: 8
- **Total String Count**: ~100+ strings
- **High Priority Components**: 2 (CommentForm, ReportDialog - account for 40+ strings)
- **Translation Namespaces**: 6 (`comment`, `report`, `common`, `biz.game`, `biz.category`, `biz.tag`)
- **Max Key Depth**: 3 levels (e.g., `biz.game.hot_games`)

---

**End of Report**
