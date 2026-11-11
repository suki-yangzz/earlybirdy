/* 学习时长最小埋点：页面/播放处于活跃状态时按固定间隔累计秒数 */
import { useEffect, useRef } from 'react';

export type StudyModule = 'audio' | 'cards' | 'video' | 'tasks';

export function useStudyTimer(
  active: boolean,
  module: StudyModule,
  onTick: (module: StudyModule, seconds: number) => void,
  intervalMs: number = 15000,
) {
  const cb = useRef(onTick);
  cb.current = onTick;

  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => {
      cb.current(module, Math.round(intervalMs / 1000));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, module, intervalMs]);
}
