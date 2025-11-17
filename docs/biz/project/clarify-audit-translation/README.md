# 翻译审计统计 - 文档目录

本目录包含翻译审计统计系统的完整文档。

## 文档列表

### 1. [架构文档](./architecture.md)
详细说明翻译审计统计系统的完整架构，包括：
- 核心服务层实现
- API 路由设计
- CMS 页面展示
- 数据流和类型定义
- 完成度计算规则
- 扩展指南

## 快速导航

### 核心文件
- **服务**: `src/services/content/translation-audit.ts`
- **类型**: `src/types/services/translation-audit.ts`
- **API**:
  - `src/app/api/admin/translations/audit/route.ts`
  - `src/app/api/admin/languages/[code]/audit/route.ts`
- **页面**:
  - `src/app/[locale]/admin/translations/page.tsx` (多语言管理)
  - `src/app/[locale]/admin/translations/audit/page.tsx` (审计仪表盘)
- **组件**: `src/components/admin/translation-dashboard.tsx`

### CMS 访问路径
- `/admin/translations` - 多语言管理页
- `/admin/translations/audit` - 翻译审计仪表盘

### API 端点
- `GET /api/admin/translations/audit` - 全局审计数据
- `GET /api/admin/languages/{code}/audit` - 单语言审计数据

## 系统概览

翻译审计统计系统用于监控和管理整个项目的多语言翻译完成度，支持：

1. **四种内容类型**: Category、Tag、Featured、Game
2. **双层统计**: 所有内容 vs 在线内容
3. **多维度统计**: 全局、按类型、按语言
4. **实时更新**: 基于 SWR 的自动刷新机制
5. **灵活过滤**: 支持按类型、状态、语言过滤

## 主要功能

- ✅ 翻译完成度百分比计算
- ✅ 缺失字段识别
- ✅ 在线/离线游戏分离统计
- ✅ 分页支持
- ✅ 实时数据刷新
- ✅ 详细的内容项翻译状态查看

## 更新记录

- 2025-01-14: 初始文档创建
