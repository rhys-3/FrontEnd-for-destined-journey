import type { Rarity } from '../types';

/**
 * 品质/稀有度选项配置
 */
export const RARITY_OPTIONS: { value: Rarity; label: string; color: string }[] = [
  { value: 'common', label: '普通', color: '#9e9e9e' },
  { value: 'uncommon', label: '优秀', color: '#4caf50' },
  { value: 'rare', label: '稀有', color: '#2196f3' },
  { value: 'epic', label: '史诗', color: '#9c27b0' },
  { value: 'legendary', label: '传说', color: '#ff9800' },
  { value: 'mythic', label: '神话', color: '#e91e63' },
  { value: 'only', label: '唯一', color: '#ff0000' },
];

/**
 * 装备类型选项配置
 */
export const EQUIPMENT_TYPE_OPTIONS = [
  { label: '武器', value: '武器' },
  { label: '防具', value: '防具' },
  { label: '饰品', value: '饰品' },
] as const;

/**
 * 技能类型选项配置
 */
export const SKILL_TYPE_OPTIONS = [
  { label: '主动', value: '主动' },
  { label: '被动', value: '被动' },
] as const;

/**
 * 物品大分类选项
 */
export const CATEGORY_OPTIONS = [
  { value: 'equipment', label: '装备' },
  { value: 'item', label: '道具' },
  { value: 'skill', label: '技能' },
] as const;

/**
 * 获取稀有度显示标签
 */
export const getRarityLabel = (value: string | undefined): string => {
  return RARITY_OPTIONS.find(opt => opt.value === value)?.label || '普通';
};

/**
 * 获取稀有度颜色
 */
export const getRarityColor = (value: string | undefined): string => {
  return RARITY_OPTIONS.find(opt => opt.value === value)?.color || '#9e9e9e';
};
