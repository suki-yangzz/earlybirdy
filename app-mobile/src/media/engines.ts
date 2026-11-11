import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';
import type { VideoPlayer } from 'expo-video';

/**
 * 原生后台音频（B3）：
 * - app.json 已配置 iOS UIBackgroundModes=audio 与 expo-audio enableBackgroundPlayback（Android 前台服务/媒体会话）
 * - 运行时把音频会话设为 shouldPlayInBackground；Android 还需锁屏控制才能持续播放
 * - Web 无后台音频概念，调用会被 expo-audio 忽略
 */
let audioModeReady = false;
function ensureBackgroundAudioMode() {
  if (Platform.OS === 'web' || audioModeReady) return;
  audioModeReady = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const audio = require('expo-audio');
    audio.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  } catch (err) {
    /* 运行环境不支持时保持前台播放 */
  }
}

function enableLockScreen(player: AudioPlayer | null) {
  if (!player || Platform.OS === 'web') return;
  try {
    player.setActiveForLockScreen(true, { title: '芽芽成长 · 儿歌', artist: '芽芽成长' });
  } catch (err) {
    /* 锁屏控制在部分环境不可用 */
  }
}

/**
 * 媒体播放引擎（音频）：
 * - 优先使用 Expo 官方 expo-audio（Web / iOS / Android 一套代码）
 * - 资源不可用、跨域被拦、浏览器自动播放被拒时，自动降级为「静默演示」：
 *   本地计时推进进度，播放/暂停/进度/收藏/定时等控件全部可用
 */
export type EngineMode = 'real' | 'sim';

export type AudioEngine = {
  time: number;
  duration: number;
  playing: boolean;
  mode: EngineMode;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
};

export function useAudioEngine(src: string | null, fallbackDuration: number, onEnd: () => void): AudioEngine {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<EngineMode>('sim');

  const playerRef = useRef<AudioPlayer | null>(null);
  const endRef = useRef(onEnd);
  const endedRef = useRef(false);
  endRef.current = onEnd;

  useEffect(() => {
    let disposed = false;
    endedRef.current = false;
    setTime(0);
    setPlaying(false);
    setDuration(fallbackDuration || 0);
    setMode('sim');
    playerRef.current = null;
    if (!src) return;

    let player: AudioPlayer | null = null;
    ensureBackgroundAudioMode();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const audio = require('expo-audio');
      player = audio.createAudioPlayer({ uri: src }, { updateInterval: 300 });
      playerRef.current = player;
      enableLockScreen(player);
    } catch (err) {
      player = null;
    }

    const tick = setInterval(() => {
      if (disposed) return;
      const p = playerRef.current;
      if (!p) return;
      const loaded = !!(p as any).isLoaded && Number((p as any).duration) > 0;
      if (!loaded) return;
      const dur = Number((p as any).duration);
      const t = Number((p as any).currentTime);
      const isPlaying = !!(p as any).playing;
      setMode('real');
      setDuration(dur);
      setTime(t);
      setPlaying(isPlaying);
      if (isPlaying && dur > 0 && t >= dur - 0.4 && !endedRef.current) {
        endedRef.current = true;
        endRef.current();
      }
    }, 300);

    return () => {
      disposed = true;
      clearInterval(tick);
      try { player?.release(); } catch (err) { /* 已释放 */ }
      playerRef.current = null;
    };
  }, [src, fallbackDuration]);

  // 静默演示：没有真实媒体时用计时器推进
  useEffect(() => {
    if (mode !== 'sim' || !playing) return;
    const timer = setInterval(() => {
      setTime((prev) => {
        const next = prev + 1;
        if (next >= duration) {
          if (!endedRef.current) {
            endedRef.current = true;
            setTimeout(() => endRef.current(), 0);
          }
          return duration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, playing, duration]);

  return {
    time,
    duration,
    playing,
    mode,
    play() {
      endedRef.current = false;
      const p = playerRef.current;
      if (p) {
        try { p.play(); } catch (err) { /* 降级计时器继续 */ }
      }
      setPlaying(true);
    },
    pause() {
      const p = playerRef.current;
      if (p) {
        try { p.pause(); } catch (err) { /* 忽略 */ }
      }
      setPlaying(false);
    },
    seek(seconds: number) {
      const target = Math.max(0, Math.min(duration, seconds));
      setTime(target);
      const p = playerRef.current;
      if (p && (p as any).isLoaded) {
        try { p.seekTo(target); } catch (err) { /* 忽略 */ }
      }
    },
    seekBy(delta: number) {
      const p = playerRef.current;
      const loaded = !!(p && (p as any).isLoaded);
      const base = loaded ? Number((p as any).currentTime) || 0 : time;
      const total = loaded ? Number((p as any).duration) || duration : duration;
      const target = Math.max(0, Math.min(total, base + delta));
      setTime(target);
      if (loaded) {
        try { p!.seekTo(target); } catch (err) { /* 忽略 */ }
      }
    },
  };
}

/** 视频引擎：expo-video 真实播放；加载失败自动降级为动画演示 + 模拟进度 */
export type VideoEngine = AudioEngine & { player: VideoPlayer | null; error: boolean };

export function useVideoEngine(src: string | null, fallbackDuration: number, onEnd: () => void): VideoEngine {
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<EngineMode>('sim');
  const [error, setError] = useState(false);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);

  const playerRef = useRef<VideoPlayer | null>(null);
  const endRef = useRef(onEnd);
  const endedRef = useRef(false);
  endRef.current = onEnd;

  useEffect(() => {
    let disposed = false;
    endedRef.current = false;
    setTime(0);
    setPlaying(false);
    setDuration(fallbackDuration || 0);
    setMode('sim');
    setError(false);
    playerRef.current = null;
    setPlayer(null);
    if (!src) return;

    let p: VideoPlayer | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const video = require('expo-video');
      const created: VideoPlayer = video.createVideoPlayer({ uri: src });
      created.loop = false;
      p = created;
      playerRef.current = p;
      setPlayer(p);
    } catch (err) {
      p = null;
    }

    const tick = setInterval(() => {
      if (disposed) return;
      const current = playerRef.current;
      if (!current) return;
      const status = (current as any).status;
      const dur = Number((current as any).duration);
      if (status === 'error') {
        setError(true);
        setMode('sim');
        return;
      }
      if (status !== 'readyToPlay' || !(dur > 0)) return;
      const t = Number((current as any).currentTime);
      const isPlaying = !!(current as any).playing;
      setError(false);
      setMode('real');
      setDuration(dur);
      setTime(t);
      setPlaying(isPlaying);
      if (isPlaying && t >= dur - 0.4 && !endedRef.current) {
        endedRef.current = true;
        endRef.current();
      }
    }, 300);

    return () => {
      disposed = true;
      clearInterval(tick);
      try { p?.release(); } catch (err) { /* 已释放 */ }
      playerRef.current = null;
      setPlayer(null);
    };
  }, [src, fallbackDuration]);

  useEffect(() => {
    if (mode !== 'sim' || !playing) return;
    const timer = setInterval(() => {
      setTime((prev) => {
        const next = prev + 1;
        if (next >= duration) {
          if (!endedRef.current) {
            endedRef.current = true;
            setTimeout(() => endRef.current(), 0);
          }
          return duration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, playing, duration]);

  return {
    time,
    duration,
    playing,
    mode,
    player,
    error,
    play() {
      endedRef.current = false;
      const current = playerRef.current;
      if (current) {
        try { current.play(); } catch (err) { /* 降级计时器继续 */ }
      }
      setPlaying(true);
    },
    pause() {
      const current = playerRef.current;
      if (current) {
        try { current.pause(); } catch (err) { /* 忽略 */ }
      }
      setPlaying(false);
    },
    seek(seconds: number) {
      const current = playerRef.current;
      const total = current ? Number((current as any).duration) || duration : duration;
      const target = Math.max(0, Math.min(total, seconds));
      setTime(target);
      if (current) {
        try { current.currentTime = target; } catch (err) { /* 忽略 */ }
      }
    },
    seekBy(delta: number) {
      const current = playerRef.current;
      const loaded = !!current && Number((current as any).duration) > 0;
      const base = loaded ? Number((current as any).currentTime) || 0 : time;
      const total = loaded ? Number((current as any).duration) : duration;
      const target = Math.max(0, Math.min(total, base + delta));
      setTime(target);
      if (current) {
        try { current.currentTime = target; } catch (err) { /* 忽略 */ }
      }
    },
  };
}

export function fmtTime(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
