import { klona } from 'klona';
import type { Background, CharacterConfig, Equipment, Item, Partner, Skill } from '../types';

/**
 * 预设数据结构
 */
export interface CharacterPreset {
  /** 预设名称 */
  name: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 角色配置 */
  character: Omit<CharacterConfig, 'attributes'>;
  /** 选择的装备列表 */
  equipments: Equipment[];
  /** 选择的道具列表 */
  items: Item[];
  /** 选择的技能列表 */
  skills: Skill[];
  /** 选择的伙伴列表 */
  partners: Partner[];
  /** 选择的背景 */
  background: Background | null;
}

/**
 * 预设存储结构
 */
interface PresetStorage {
  /** 预设列表 */
  presets: CharacterPreset[];
  /** 上次使用的预设名称 */
  lastUsedPreset?: string;
}

/** 角色卡变量中存储预设的键名 */
const PRESET_STORAGE_KEY = 'start_presets';

/**
 * 获取预设存储数据
 * 从角色卡变量中读取
 */
export function getPresetStorage(): PresetStorage {
  try {
    const variables = getVariables({ type: 'character' });
    const storage = _.get(variables, PRESET_STORAGE_KEY) as PresetStorage | undefined;

    if (storage && _.isArray(storage.presets)) {
      return storage;
    }
  } catch (error) {
    console.warn('读取预设存储失败，返回空存储:', error);
  }

  return { presets: [] };
}

/**
 * 保存预设存储数据
 * 写入角色卡变量
 */
export function savePresetStorage(storage: PresetStorage): void {
  try {
    insertOrAssignVariables({ [PRESET_STORAGE_KEY]: storage }, { type: 'character' });
    console.log('✅ 预设存储已保存到角色卡变量');
  } catch (error) {
    console.error('保存预设存储失败:', error);
    throw error;
  }
}

/**
 * 获取所有预设列表
 * 使用 _.orderBy 按更新时间倒序排列
 */
export function listPresets(): CharacterPreset[] {
  const storage = getPresetStorage();
  return _.orderBy(storage.presets, ['updatedAt'], ['desc']);
}

/**
 * 检查是否存在任何预设
 * 使用 _.isEmpty 检查
 */
export function hasPresets(): boolean {
  const storage = getPresetStorage();
  return !_.isEmpty(storage.presets);
}

/**
 * 获取指定名称的预设
 * 使用 _.find 查找
 */
export function getPreset(name: string): CharacterPreset | undefined {
  const storage = getPresetStorage();
  return _.find(storage.presets, { name });
}

/**
 * 检查预设名称是否已存在
 * 使用 _.some 检查
 */
export function isPresetNameExists(name: string): boolean {
  const storage = getPresetStorage();
  return _.some(storage.presets, { name });
}

/**
 * 保存新预设或更新现有预设
 * 使用 _.findIndex 查找索引
 * @param preset 预设数据
 * @param overwrite 如果预设已存在，是否覆盖
 * @returns 是否保存成功
 */
export function savePreset(preset: CharacterPreset, overwrite = false): boolean {
  const storage = getPresetStorage();
  const existingIndex = _.findIndex(storage.presets, { name: preset.name });

  if (existingIndex !== -1) {
    if (!overwrite) {
      toastr.warning(`预设「${preset.name}」已存在`);
      return false;
    }
    // 更新现有预设
    storage.presets[existingIndex] = {
      ...preset,
      updatedAt: Date.now(),
    };
    toastr.success(`预设「${preset.name}」已更新`);
  } else {
    // 添加新预设
    storage.presets.push({
      ...preset,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toastr.success(`预设「${preset.name}」已保存`);
  }

  storage.lastUsedPreset = preset.name;
  savePresetStorage(storage);
  return true;
}

/**
 * 删除预设
 * 使用 _.remove 移除元素
 * @param name 预设名称
 * @returns 是否删除成功
 */
export function deletePreset(name: string): boolean {
  const storage = getPresetStorage();
  const removed = _.remove(storage.presets, { name });

  if (!_.isEmpty(removed)) {
    // 如果删除的是上次使用的预设，清除记录
    if (storage.lastUsedPreset === name) {
      storage.lastUsedPreset = undefined;
    }
    savePresetStorage(storage);
    toastr.info(`预设「${name}」已删除`);
    return true;
  }

  toastr.error(`预设「${name}」不存在`);
  return false;
}

/**
 * 获取上次使用的预设名称
 */
export function getLastUsedPresetName(): string | undefined {
  const storage = getPresetStorage();
  return storage.lastUsedPreset;
}

/**
 * 设置上次使用的预设名称
 */
export function setLastUsedPresetName(name: string): void {
  const storage = getPresetStorage();
  storage.lastUsedPreset = name;
  savePresetStorage(storage);
}

/**
 * 从 store 中创建预设数据
 * @param name 预设名称
 * @param characterStore 角色 store 实例
 */
export function createPresetFromStore(
  name: string,
  characterStore: {
    character: Omit<CharacterConfig, 'attributes'>;
    selectedEquipments: Equipment[];
    selectedItems: Item[];
    selectedSkills: Skill[];
    selectedPartners: Partner[];
    selectedBackground: Background | null;
  },
): CharacterPreset {
  const now = Date.now();

  return {
    name,
    createdAt: now,
    updatedAt: now,
    character: klona(characterStore.character),
    equipments: klona(characterStore.selectedEquipments),
    items: klona(characterStore.selectedItems),
    skills: klona(characterStore.selectedSkills),
    partners: klona(characterStore.selectedPartners),
    background: klona(characterStore.selectedBackground),
  };
}

/** 角色配置字段列表，用于预设应用 */
const CharacterFields = [
  'name',
  'gender',
  'customGender',
  'age',
  'race',
  'customRace',
  'identity',
  'customIdentity',
  'startLocation',
  'customStartLocation',
  'level',
  'basePoints',
  'attributePoints',
  'reincarnationPoints',
  'destinyPoints',
  'money',
] as const;

/** 空属性点模板 */
const EmptyAttrPoints = { 力量: 0, 敏捷: 0, 体质: 0, 智力: 0, 精神: 0 };

/** 旧版额外点公式比新版多算的基础值 */
const OldBaseAPOffset = 5;
/** 属性键列表 */
const AttrKeys = ['力量', '敏捷', '体质', '智力', '精神'] as const;

/**
 * 兼容旧版预设数据
 *
 * 迁移策略：从旧 attributePoints 中总共扣除5点（每项各减1，不足则减到0），
 * basePoints 初始化为全零由玩家重新分配
 */
function migratePresetCharacter(char: Record<string, unknown>): Record<string, unknown> {
  if (!('basePoints' in char)) {
    // 从旧 attributePoints 扣除多算的5点
    const oldAttr = char.attributePoints as Record<string, number> | undefined;
    if (oldAttr) {
      let remaining = OldBaseAPOffset;
      const newAttr = { ...oldAttr };

      // 每个属性各减1点（循环扣除，保证公平）
      for (const key of AttrKeys) {
        if (remaining <= 0) break;
        const deduct = Math.min(newAttr[key] || 0, 1);
        newAttr[key] = (newAttr[key] || 0) - deduct;
        remaining -= deduct;
      }

      // 若还有剩余未扣完（某些属性为0），从有余量的属性继续扣
      for (const key of AttrKeys) {
        if (remaining <= 0) break;
        const deduct = Math.min(newAttr[key] || 0, remaining);
        newAttr[key] = (newAttr[key] || 0) - deduct;
        remaining -= deduct;
      }

      return { ...char, attributePoints: newAttr, basePoints: { ...EmptyAttrPoints } };
    }

    return { ...char, basePoints: { ...EmptyAttrPoints } };
  }
  return char;
}

/**
 * 将预设数据应用到 store
 * 使用 _.forEach 简化循环
 * @param preset 预设数据
 * @param characterStore 角色 store 实例（需要包含各种 setter 方法）
 */
export function applyPresetToStore(
  preset: CharacterPreset,
  characterStore: {
    character: Omit<CharacterConfig, 'attributes'>;
    resetCharacter: () => void;
    updateCharacterField: (field: keyof CharacterConfig, value: unknown) => void;
    clearAllSelections: () => void;
    addEquipment: (equipment: Equipment) => void;
    addItem: (item: Item) => void;
    addSkill: (skill: Skill) => void;
    addPartner: (partner: Partner) => void;
    setBackground: (background: Background | null) => void;
  },
): void {
  // 1. 重置角色数据和所有选择（包括伙伴和背景）
  characterStore.resetCharacter();
  characterStore.clearAllSelections();

  // 2. 兼容旧预设：补充 basePoints 默认值
  const migratedCharacter = migratePresetCharacter(
    preset.character as unknown as Record<string, unknown>,
  );

  // 3. 应用角色基本信息
  _.forEach(CharacterFields, field => {
    if (_.has(migratedCharacter, field)) {
      characterStore.updateCharacterField(
        field as keyof CharacterConfig,
        _.get(migratedCharacter, field),
      );
    }
  });

  // 3. 应用装备、道具、技能、伙伴
  _.forEach(preset.equipments, eq => characterStore.addEquipment(eq));
  _.forEach(preset.items, item => characterStore.addItem(item));
  _.forEach(preset.skills, skill => characterStore.addSkill(skill));
  _.forEach(preset.partners, partner => characterStore.addPartner(partner));

  // 4. 应用背景
  characterStore.setBackground(preset.background);

  toastr.success(`已加载预设「${preset.name}」`);
}

/**
 * 格式化预设创建时间为可读字符串
 */
export function formatPresetTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 需要排除的动态字段 */
const DynamicFields = ['createdAt', 'updatedAt'];

/**
 * 比较当前 store 数据与预设是否相同
 * 使用 _.every 和 _.isEqual 进行深度比较
 * @param preset 预设数据
 * @param characterStore 角色 store 实例
 * @returns 是否相同
 */
export function isStoreMatchingPreset(
  preset: CharacterPreset,
  characterStore: {
    character: Omit<CharacterConfig, 'attributes'>;
    selectedEquipments: Equipment[];
    selectedItems: Item[];
    selectedSkills: Skill[];
    selectedPartners: Partner[];
    selectedBackground: Background | null;
  },
): boolean {
  // 比较角色基本信息（排除时间戳等动态字段）
  const charToCompare = _.omit(characterStore.character, DynamicFields);
  const presetCharToCompare = _.omit(preset.character, DynamicFields);

  // 使用 _.every 简化多个比较
  return _.every([
    _.isEqual(charToCompare, presetCharToCompare),
    _.isEqual(characterStore.selectedEquipments, preset.equipments),
    _.isEqual(characterStore.selectedItems, preset.items),
    _.isEqual(characterStore.selectedSkills, preset.skills),
    _.isEqual(characterStore.selectedPartners, preset.partners),
    _.isEqual(characterStore.selectedBackground, preset.background),
  ]);
}

/**
 * 检查当前 store 数据是否与任一预设相同
 * 使用 _.find 查找匹配的预设
 * @param characterStore 角色 store 实例
 * @returns 匹配的预设名称，如果没有匹配则返回 null
 */
export function findMatchingPreset(characterStore: {
  character: Omit<CharacterConfig, 'attributes'>;
  selectedEquipments: Equipment[];
  selectedItems: Item[];
  selectedSkills: Skill[];
  selectedPartners: Partner[];
  selectedBackground: Background | null;
}): string | null {
  const presets = listPresets();
  const matchingPreset = _.find(presets, preset => isStoreMatchingPreset(preset, characterStore));
  return matchingPreset?.name ?? null;
}

// ===================== 导入/导出功能 =====================

/** 导出文件格式版本 */
const EXPORT_VERSION = 1;

/**
 * 导出文件的数据结构
 */
export interface PresetExportFile {
  /** 格式版本 */
  version: number;
  /** 导出类型：single（单个预设）或 batch（批量导出） */
  type: 'single' | 'batch';
  /** 导出时间戳 */
  exportedAt: number;
  /** 预设列表 */
  presets: CharacterPreset[];
}

/**
 * 导入冲突项
 */
export interface ImportConflict {
  /** 导入的预设数据 */
  preset: CharacterPreset;
  /** 用户选择的处理方式 */
  resolution: 'overwrite' | 'rename' | 'skip';
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 成功导入的数量 */
  imported: number;
  /** 跳过的数量 */
  skipped: number;
  /** 覆盖的数量 */
  overwritten: number;
  /** 重命名的数量 */
  renamed: number;
}

/**
 * 触发浏览器下载文件
 * @param content 文件内容
 * @param fileName 文件名
 */
function downloadFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出单个预设为 JSON 文件
 * @param preset 要导出的预设
 */
export function exportPreset(preset: CharacterPreset): void {
  const exportData: PresetExportFile = {
    version: EXPORT_VERSION,
    type: 'single',
    exportedAt: Date.now(),
    presets: [klona(preset)],
  };

  const content = JSON.stringify(exportData, null, 2);
  const fileName = `${preset.name}.preset.json`;
  downloadFile(content, fileName);
  toastr.success(`预设「${preset.name}」已导出`);
}

/**
 * 导出所有预设为 JSON 文件
 */
export function exportAllPresets(): void {
  const presets = listPresets();
  if (_.isEmpty(presets)) {
    toastr.warning('没有可导出的预设');
    return;
  }

  const exportData: PresetExportFile = {
    version: EXPORT_VERSION,
    type: 'batch',
    exportedAt: Date.now(),
    presets: klona(presets),
  };

  const content = JSON.stringify(exportData, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `所有预设_${date}.presets.json`;
  downloadFile(content, fileName);
  toastr.success(`已导出 ${presets.length} 个预设`);
}

/**
 * 验证导入文件的格式
 * @param data 解析后的 JSON 数据
 * @returns 验证后的数据或 null（验证失败）
 */
export function validatePresetFile(data: unknown): PresetExportFile | null {
  if (!_.isPlainObject(data)) {
    toastr.error('导入失败：文件格式不正确');
    return null;
  }

  const file = data as Record<string, unknown>;

  // 检查必要字段
  if (!_.has(file, 'version') || !_.has(file, 'presets')) {
    toastr.error('导入失败：缺少必要字段（version/presets）');
    return null;
  }

  if (!_.isArray(file.presets)) {
    toastr.error('导入失败：presets 字段格式不正确');
    return null;
  }

  const presets = file.presets as Record<string, unknown>[];

  // 验证每个预设的基本结构
  const requiredFields = ['name', 'character'];
  for (const preset of presets) {
    const missing = _.filter(requiredFields, field => !_.has(preset, field));
    if (!_.isEmpty(missing)) {
      toastr.error(`导入失败：预设缺少必要字段（${missing.join(', ')}）`);
      return null;
    }
  }

  return {
    version: file.version as number,
    type: (file.type as 'single' | 'batch') || 'single',
    exportedAt: (file.exportedAt as number) || Date.now(),
    presets: presets as unknown as CharacterPreset[],
  };
}

/**
 * 读取用户选择的文件内容
 * @returns 文件内容的 Promise
 */
export function readFileFromInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });

    // 用户取消选择
    input.addEventListener('cancel', () => {
      reject(new Error('用户取消'));
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * 检测导入预设与现有预设的冲突
 * @param presets 要导入的预设列表
 * @returns 冲突列表和无冲突列表
 */
export function detectConflicts(presets: CharacterPreset[]): {
  conflicts: ImportConflict[];
  noConflicts: CharacterPreset[];
} {
  const conflicts: ImportConflict[] = [];
  const noConflicts: CharacterPreset[] = [];

  _.forEach(presets, preset => {
    if (isPresetNameExists(preset.name)) {
      conflicts.push({ preset, resolution: 'overwrite' });
    } else {
      noConflicts.push(preset);
    }
  });

  return { conflicts, noConflicts };
}

/**
 * 生成不冲突的重命名
 * @param name 原始名称
 * @returns 不冲突的新名称
 */
export function generateUniqueName(name: string): string {
  let suffix = 1;
  let newName = `${name} (${suffix})`;
  while (isPresetNameExists(newName)) {
    suffix++;
    newName = `${name} (${suffix})`;
  }
  return newName;
}

/**
 * 执行预设导入
 * 处理无冲突的预设和已解决冲突的预设
 * @param noConflicts 无冲突预设列表
 * @param resolvedConflicts 已解决的冲突列表
 * @returns 导入结果
 */
export function executeImport(
  noConflicts: CharacterPreset[],
  resolvedConflicts: ImportConflict[],
): ImportResult {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    overwritten: 0,
    renamed: 0,
  };

  // 导入无冲突的预设
  _.forEach(noConflicts, preset => {
    savePreset(
      {
        ...preset,
        createdAt: preset.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      false,
    );
    result.imported++;
  });

  // 处理冲突预设
  _.forEach(resolvedConflicts, ({ preset, resolution }) => {
    switch (resolution) {
      case 'overwrite':
        savePreset(
          {
            ...preset,
            updatedAt: Date.now(),
          },
          true,
        );
        result.overwritten++;
        break;

      case 'rename': {
        const newName = generateUniqueName(preset.name);
        savePreset(
          {
            ...preset,
            name: newName,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          false,
        );
        result.renamed++;
        break;
      }

      case 'skip':
        result.skipped++;
        break;
    }
  });

  // 汇总提示
  const messages: string[] = [];
  const total = result.imported + result.overwritten + result.renamed;
  if (total > 0) messages.push(`成功导入 ${total} 个预设`);
  if (result.overwritten > 0) messages.push(`覆盖 ${result.overwritten} 个`);
  if (result.renamed > 0) messages.push(`重命名 ${result.renamed} 个`);
  if (result.skipped > 0) messages.push(`跳过 ${result.skipped} 个`);

  if (total > 0) {
    toastr.success(messages.join('，'));
  } else if (result.skipped > 0) {
    toastr.info(`已跳过所有 ${result.skipped} 个冲突预设`);
  }

  return result;
}
