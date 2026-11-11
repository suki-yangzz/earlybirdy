import Constants from 'expo-constants';
/* Web 端 Expo 注入的 manifest 会裁掉 ios / android / extra，
   直接以本地 app.json 作为兜底，保证 build 号有真实来源 */
import appJson from '../app.json';

const localCfg: any = (appJson as any).expo || {};

/** 兼容 Expo 不同运行时的 config 读取方式 */
function appConfig(): any {
  const anyConstants: any = Constants as any;
  return (
    anyConstants.expoConfig ||
    (anyConstants.manifest2 && anyConstants.manifest2.extra && anyConstants.manifest2.extra.expoClient) ||
    anyConstants.manifest ||
    {}
  );
}

/** 形如 v1.0.0 (12)：版本号与 build 号都来自 app.json / expo-constants */
export function appVersionLabel(): string {
  const cfg = appConfig();
  /* app.json 是版本号的唯一事实来源；expo-constants 作为运行时兜底 */
  const version = localCfg.version || cfg.version || '0.0.0';
  const build =
    (localCfg.ios && localCfg.ios.buildNumber) ||
    (localCfg.android && localCfg.android.versionCode) ||
    (localCfg.extra && localCfg.extra.buildNumber) ||
    (cfg.ios && cfg.ios.buildNumber) ||
    (cfg.android && cfg.android.versionCode) ||
    (cfg.extra && cfg.extra.buildNumber) ||
    'dev';
  return `v${version} (${build})`;
}

export function sdkVersionLabel(): string {
  const cfg = appConfig();
  const anyConstants: any = Constants as any;
  return String(cfg.sdkVersion || anyConstants.expoVersion || localCfg.sdkVersion || '').replace(/^sdkVersion-/, '');
}
