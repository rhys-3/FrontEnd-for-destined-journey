import { BASE_STAT, getLevelTierName, getTierAttributeBonus } from '../data/base-info';
import { RARITY_MAP } from '../data/constants';
import type { Background, CharacterConfig, DestinedOne, Equipment, Item, Skill } from '../types';

/**
 * 解析货币描述，提取金币、银币、铜币数量
 */
function parseCurrency(description: string): { gold: number; silver: number; copper: number } {
  const result = { gold: 0, silver: 0, copper: 0 };

  // 匹配金币
  const goldMatch = description.match(/(\d+)金币/);
  if (goldMatch) result.gold = parseInt(goldMatch[1]);

  // 匹配银币
  const silverMatch = description.match(/(\d+)银币/);
  if (silverMatch) result.silver = parseInt(silverMatch[1]);

  // 匹配铜币
  const copperMatch = description.match(/(\d+)铜币/);
  if (copperMatch) result.copper = parseInt(copperMatch[1]);

  return result;
}

/**
 * 将角色数据写入到 MVU 变量中
 * 使用 Mvu.setMvuVariable 直接操作变量，比 parseMessage 更高效、更类型安全
 */
export async function writeCharacterToMvu(
  character: CharacterConfig,
  items: Item[],
  skills: Skill[],
  destinedOnes: DestinedOne[],
): Promise<void> {
  await waitGlobalInitialized('Mvu');

  const presetSkills = skills.filter(skill => !skill.isCustom);
  const presetItems = items.filter(item => !item.isCustom);
  const presetDestinedOnes = destinedOnes.filter(one => !one.isCustom);

  const mvuData = Mvu.getMvuData({ type: 'message', message_id: 'latest' });

  // 命运点数
  await Mvu.setMvuVariable(mvuData, '命定系统.命运点数', character.destinyPoints);

  // 技能列表：先清空再添加
  const skillsData: Record<string, any> = {};
  for (const skill of presetSkills) {
    skillsData[skill.name] = {
      品质: RARITY_MAP[skill.rarity] || '普通',
      类型: skill.type,
      消耗: skill.consume || '',
      标签: skill.tag,
      效果: skill.effect,
      描述: skill.description,
    };
  }
  await Mvu.setMvuVariable(mvuData, '角色.技能列表', skillsData);

  // 货币初始化
  let goldTotal = 0;
  let silverTotal = 0;
  let copperTotal = 0;

  // 背包：先清空再添加
  const bagData: Record<string, any> = {};
  for (const item of presetItems) {
    if (item.type === '货币') {
      const currency = parseCurrency(item.description);
      goldTotal += currency.gold;
      silverTotal += currency.silver;
      copperTotal += currency.copper;
    } else {
      bagData[item.name] = {
        品质: RARITY_MAP[item.rarity] || '普通',
        数量: item.quantity || 1,
        类型: item.type,
        标签: item.tag,
        效果: item.effect,
        描述: item.description,
      };
    }
  }
  await Mvu.setMvuVariable(mvuData, '背包', bagData, { reason: '初始化背包' });
  await Mvu.setMvuVariable(mvuData, '货币.金币', goldTotal, { reason: '初始化金币' });
  await Mvu.setMvuVariable(mvuData, '货币.银币', silverTotal, { reason: '初始化银币' });
  await Mvu.setMvuVariable(mvuData, '货币.铜币', copperTotal, { reason: '初始化铜币' });

  // 命定之人
  const destinedOnesData: Record<string, any> = {};
  for (const one of presetDestinedOnes) {
    const oneData: Record<string, any> = {
      是否在场: '是',
      生命层级: one.lifeLevel,
      等级: one.level,
      种族: one.race,
      身份: [...one.identity],
      职业: [...one.career],
      性格: one.personality,
      喜爱: one.like,
      外貌特质: one.app,
      衣物装饰: one.cloth,
      属性: {
        力量: one.attributes.strength,
        敏捷: one.attributes.dexterity,
        体质: one.attributes.constitution,
        智力: one.attributes.intelligence,
        精神: one.attributes.mind,
      },
      登神长阶: {
        是否开启: one.stairway.isOpen ? '是' : '否',
      },
      是否缔结契约: one.isContract ? '是' : '否',
      好感度: one.affinity,
      评价: one.comment || '',
      背景故事: one.backgroundInfo || '',
      装备: {} as Record<string, any>,
      技能: {} as Record<string, any>,
    };

    for (const eq of one.equip) {
      if (eq.name) {
        oneData.装备[eq.name] = {
          品质: eq.rarity ? RARITY_MAP[eq.rarity] || '普通' : '普通',
          类型: eq.type || '',
          标签: eq.tag || '',
          效果: eq.effect || '',
          描述: eq.description || '',
        };
      }
    }

    for (const skill of one.skills) {
      oneData.技能[skill.name] = {
        品质: RARITY_MAP[skill.rarity] || '普通',
        类型: skill.type,
        消耗: skill.consume || '',
        标签: skill.tag,
        效果: skill.effect,
        描述: skill.description,
      };
    }

    destinedOnesData[one.name] = oneData;
  }
  await Mvu.setMvuVariable(mvuData, '命定系统.命定之人', destinedOnesData);

  // 将更新后的数据写回
  await Mvu.replaceMvuData(mvuData, { type: 'message', message_id: 'latest' });
  console.log('✅ 预设数据已成功写入消息楼层变量');
}

/**
 * 生成发送给 AI 的提示词数据（纯文本格式）
 */
export function generateAIPrompt(
  character: CharacterConfig,
  equipments: Equipment[],
  destinedOnes: DestinedOne[],
  background: Background | null,
  items: Item[],
  skills: Skill[],
): string {
  const lines: string[] = [];
  const displayGender = character.gender === '自定义' ? character.customGender : character.gender;
  const displayRace = character.race === '自定义' ? character.customRace : character.race;
  const displayIdentity =
    character.identity === '自定义' ? character.customIdentity : character.identity;
  const displayLocation =
    character.startLocation === '自定义' ? character.customStartLocation : character.startLocation;

  const tierBonus = getTierAttributeBonus(character.level);
  const formatAttr = (extra: number) => {
    const total = BASE_STAT + tierBonus + extra;
    return `${BASE_STAT}(基础) + ${tierBonus}(层级) + ${extra}(额外) = ${total}`;
  };

  // 基本信息
  lines.push('【角色信息】');
  lines.push(`姓名: ${character.name}`);
  lines.push(`性别: ${displayGender}`);
  lines.push(`年龄: ${character.age}岁`);
  lines.push(`种族: ${displayRace}`);
  lines.push(`身份: ${displayIdentity}`);
  lines.push(`出生地: ${displayLocation}`);
  lines.push(`生命层级: ${getLevelTierName(character.level)}`);
  lines.push(`等级: Lv.${character.level}`);
  lines.push('');
  lines.push('【角色属性】');
  lines.push(`力量: ${formatAttr(character.attributePoints.力量)}`);
  lines.push(`敏捷: ${formatAttr(character.attributePoints.敏捷)}`);
  lines.push(`体质: ${formatAttr(character.attributePoints.体质)}`);
  lines.push(`智力: ${formatAttr(character.attributePoints.智力)}`);
  lines.push(`精神: ${formatAttr(character.attributePoints.精神)}`);

  // 装备列表
  if (equipments.length > 0) {
    lines.push('');
    lines.push('【装备列表】');
    equipments.forEach((eq, index) => {
      lines.push(`- 名称: ${eq.name}`);
      lines.push(`  类型: ${eq.type}`);
      lines.push(`  品质: ${RARITY_MAP[eq.rarity] || eq.rarity}`);
      if (eq.tag) lines.push(`  标签: ${eq.tag}`);
      lines.push(`  效果: ${eq.effect}`);
      if (eq.description) lines.push(`  描述: ${eq.description}`);
      // 在项目之间添加空行（末尾不加）
      if (index < equipments.length - 1) lines.push('');
    });
  }

  // 自定义道具
  const customItems = items.filter(item => item.isCustom);
  if (customItems.length > 0) {
    lines.push('');
    lines.push('【自定义道具】');
    customItems.forEach((item, index) => {
      lines.push(`- 名称: ${item.name || '未命名'}`);
      if (item.type) lines.push(`  类型: ${item.type}`);
      if (item.rarity) lines.push(`  品质: ${RARITY_MAP[item.rarity] || item.rarity}`);
      if (item.quantity) lines.push(`  数量: ${item.quantity}`);
      if (item.tag) lines.push(`  标签: ${item.tag}`);
      if (item.effect) lines.push(`  效果: ${item.effect}`);
      if (item.description) lines.push(`  描述: ${item.description}`);
      // 在项目之间添加空行（末尾不加）
      if (index < customItems.length - 1) lines.push('');
    });
  }

  // 自定义技能
  const customSkills = skills.filter(skill => skill.isCustom);
  if (customSkills.length > 0) {
    lines.push('');
    lines.push('【自定义技能】');
    customSkills.forEach((skill, index) => {
      lines.push(`- 名称: ${skill.name || '未命名'}`);
      if (skill.type) lines.push(`  类型: ${skill.type}`);
      if (skill.rarity) lines.push(`  品质: ${RARITY_MAP[skill.rarity] || skill.rarity}`);
      if (skill.tag) lines.push(`  标签: ${skill.tag}`);
      if (skill.consume) lines.push(`  消耗: ${skill.consume}`);
      if (skill.effect) lines.push(`  效果: ${skill.effect}`);
      if (skill.description) lines.push(`  描述: ${skill.description}`);
      // 在项目之间添加空行（末尾不加）
      if (index < customSkills.length - 1) lines.push('');
    });
  }

  // 命定之人
  const customOnes = destinedOnes.filter(one => one.isCustom);
  if (customOnes.length > 0) {
    lines.push('');
    lines.push('【命定之人】');
    customOnes.forEach(one => {
      lines.push(`◆ 名称: ${one.name}`);
      lines.push(`  种族: ${one.race}`);
      lines.push(`  身份: ${one.identity.join('、')}`);
      if (one.career.length > 0) lines.push(`  职业: ${one.career.join('、')}`);
      lines.push(`  生命层级: ${one.lifeLevel}`);
      lines.push(`  等级: ${one.level}`);
      lines.push(`  性格: ${one.personality}`);
      lines.push(`  喜爱: ${one.like}`);
      lines.push(`  外貌: ${one.app}`);
      lines.push(`  衣着: ${one.cloth}`);
      lines.push(`  属性:`);
      lines.push(`    力量: ${one.attributes.strength}`);
      lines.push(`    敏捷: ${one.attributes.dexterity}`);
      lines.push(`    体质: ${one.attributes.constitution}`);
      lines.push(`    智力: ${one.attributes.intelligence}`);
      lines.push(`    精神: ${one.attributes.mind}`);
      lines.push(`  是否缔结契约: ${one.isContract ? '是' : '否'}`);
      lines.push(`  好感度: ${one.affinity}`);
      if (one.equip.length > 0) {
        const validEquips = one.equip.filter(eq => eq.name);
        if (validEquips.length > 0) {
          lines.push(`  装备:`);
          validEquips.forEach((eq, eqIndex) => {
            lines.push(`    - 名称: ${eq.name}`);
            if (eq.type) lines.push(`      类型: ${eq.type}`);
            if (eq.rarity) lines.push(`      品质: ${RARITY_MAP[eq.rarity] || eq.rarity}`);
            if (eq.tag) lines.push(`      标签: ${eq.tag}`);
            if (eq.effect) lines.push(`      效果: ${eq.effect}`);
            if (eq.description) lines.push(`      描述: ${eq.description}`);
            // 在装备之间添加空行（末尾不加）
            if (eqIndex < validEquips.length - 1) lines.push('');
          });
        }
      }
      if (one.stairway.isOpen) {
        lines.push(`  登神长阶: 已开启`);
        if (one.stairway.elements?.描述) lines.push(`    描述: ${one.stairway.elements.描述}`);
      }
      if (one.comment) lines.push(`  评价: ${one.comment}`);
      if (one.backgroundInfo) lines.push(`  背景: ${one.backgroundInfo}`);
      if (one.skills.length > 0) {
        lines.push(`  技能:`);
        one.skills.forEach((sk, skIndex) => {
          lines.push(`    - 名称: ${sk.name}`);
          if (sk.type) lines.push(`      类型: ${sk.type}`);
          if (sk.rarity) lines.push(`      品质: ${RARITY_MAP[sk.rarity] || sk.rarity}`);
          if (sk.tag) lines.push(`      标签: ${sk.tag}`);
          if (sk.consume) lines.push(`      消耗: ${sk.consume}`);
          if (sk.effect) lines.push(`      效果: ${sk.effect}`);
          if (sk.description) lines.push(`      描述: ${sk.description}`);
          // 在技能之间添加空行（末尾不加）
          if (skIndex < one.skills.length - 1) lines.push('');
        });
      }
    });
  }

  // 初始开局剧情
  if (background) {
    lines.push('');
    lines.push('【初始开局剧情】');
    lines.push(`${background.name}`);
    lines.push(`描述: ${background.description}`);
  }

  const content = lines.join('\n');
  const instructions = `---
根据<status_current_variables>和以上内容，生成一个符合描述和情景的初始剧情！
（注意：生成初始剧情时，先检查上述内容是否完整，如不完整，必须参考相关设定进行完善，然后再根据内容，在<UpdateVariable>内更新数据。除非有特殊要求，更新的数据不要有任何修改和省略。）
（IMPORTANT: 已在<status_current_variables>内的数据，不得修改和删除）`;

  return `\`\`\`text\n${content}\n\`\`\`\n\n${instructions}`;
}
