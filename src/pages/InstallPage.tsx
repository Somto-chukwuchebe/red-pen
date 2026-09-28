import { CheckCircle2, Download } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AndroidMenuArt, ChromeInstallArt, IosAddArt, IosShareArt, MacDockArt } from '../components/InstallArt';
import { Banner, Button, Card, PageHeader, SectionTitle, cx } from '../components/ui';
import { useT } from '../i18n';
import { canPromptInstall, onInstallAvailability, promptInstall } from '../lib/installPrompt';
import { currentEnv, detectPlatform, type InstallPlatform } from '../lib/platform';
import { StorageCard } from './SettingsPage';

type Guide = 'ios' | 'mac' | 'android' | 'desktop';

const guideFor = (p: InstallPlatform): Guide =>
  p.startsWith('ios') ? 'ios' : p.startsWith('mac') ? 'mac' : p.startsWith('android') ? 'android' : 'desktop';

export function InstallPage() {
  const t = useT();
  const env = currentEnv();
  const platform = detectPlatform(env);
  const [guide, setGuide] = useState<Guide>(guideFor(platform));
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  useEffect(() => {
    const off = onInstallAvailability(() => setCanPrompt(canPromptInstall()));
    return () => {
      off();
    };
  }, []);

  const s = t.install.steps;
  const guides: Record<Guide, { title: string; steps: string[]; art: ReactNode[] }> = {
    ios: {
      title: t.install.platforms['ios-safari'],
      steps: platform === 'ios-other' ? s.iosOther : s.ios,
      art: [<IosShareArt key="a" label={s.ios[1]} />, <IosAddArt key="b" label={s.ios[2]} rows={t.install.art.iosRows} />],
    },
    mac: {
      title: t.install.platforms['mac-safari'],
      steps: platform === 'mac-safari-old' ? s.macOld : s.mac,
      art: [<MacDockArt key="a" label={s.mac[1]} items={t.install.art.macItems} menu={t.install.art.macMenu} />],
    },
    android: {
      title: t.install.platforms['android-chrome'],
      steps: platform === 'android-other' ? s.androidOther : s.android,
      art: [<AndroidMenuArt key="a" label={s.android[2]} items={t.install.art.androidItems} />],
    },
    desktop: {
      title: t.install.platforms['desktop-chromium'],
      steps: platform === 'desktop-firefox' ? s.firefox : s.desktop,
      art: [<ChromeInstallArt key="a" label={s.desktop[1]} />],
    },
  };
  const g = guides[guide];

  return (
    <>
      <PageHeader title={t.install.title} subtitle={t.install.detected(t.install.platforms[platform])} />
      <div className="flex max-w-3xl flex-col gap-5">
        {env.standalone ? (
          <Banner tone="good">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="text-pen" aria-hidden /> {t.install.installed}
            </span>
          </Banner>
        ) : (
          <p className="text-ink-soft">{t.install.intro}</p>
        )}

        {canPrompt && !env.standalone && (
          <div>
            <Button variant="primary" size="lg" icon={<Download size={20} />} onClick={() => promptInstall()}>
              {t.install.installNow}
            </Button>
          </div>
        )}

        <div role="tablist" aria-label={t.install.otherDevices} className="flex flex-wrap gap-2">
          {(['ios', 'mac', 'android', 'desktop'] as Guide[]).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={guide === k}
              onClick={() => setGuide(k)}
              className={cx('min-h-11 rounded-full border px-4 text-sm font-medium', guide === k ? 'border-pen bg-pen text-white dark:text-[#1b0f0e]' : 'border-line bg-card hover:bg-sunk')}
            >
              {guides[k].title}
              {guideFor(platform) === k && ' ✓'}
            </button>
          ))}
        </div>

        <Card>
          <SectionTitle>{g.title}</SectionTitle>
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <ol className="flex flex-col gap-3">
              {g.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pen font-semibold text-white dark:text-[#1b0f0e]">{i + 1}</span>
                  <span className="pt-1">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-3">{g.art}</div>
          </div>
        </Card>

        {guide === 'ios' && (
          <Card>
            <SectionTitle>{t.install.storageTitle}</SectionTitle>
            <p>{t.install.storageBody}</p>
          </Card>
        )}

        <StorageCard />
        <Banner tone="info">{t.install.oneDevice}</Banner>
      </div>
    </>
  );
}
