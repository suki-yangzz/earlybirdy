/** 设计语言对齐 prototype：奶油底、珊瑚主色、暖棕文字、大圆角卡片 */
export const COLORS = {
  cream: '#FFF8EE',
  ink: '#3B2B22',
  sub: '#A08876',
  coral: '#FF6B4A',
  yellow: '#FFC53D',
  white: '#FFFFFF',
  line: '#F2E5D7',
  muted: '#B6A18E',
};

/** 内容数据里用的是 H5 的 icon 名称，RN 里用 emoji 做等价呈现 */
export const ICON_EMOJI: Record<string, string> = {
  music: '🎵',
  heart: '💗',
  moon: '🌙',
  shop: '🛍️',
  cards: '🃏',
  hand: '✋',
  video: '🎬',
  eye: '👀',
  book: '📖',
  sparkle: '✨',
  flask: '🧪',
  headphones: '🎧',
  gift: '🎁',
  tasks: '✅',
  users: '👨‍👩‍👧',
  speaker: '🔊',
  timer: '⏰',
};

export function iconEmoji(name?: string) {
  return (name && ICON_EMOJI[name]) || '🌱';
}

export function stageTheme(stage: any) {
  const t = (stage && stage.theme) || {};
  return {
    accent: t.accent || COLORS.coral,
    accentInk: t.accentInk || '#FFFFFF',
    soft: t.soft || '#FFEFE8',
    page: t.page || COLORS.cream,
  };
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return '夜深了';
  if (h < 11) return '早上好呀';
  if (h < 14) return '中午好呀';
  if (h < 18) return '下午好呀';
  return '晚上好呀';
}
