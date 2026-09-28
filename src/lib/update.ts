// "Check for updates" in Settings. The app already updates itself each time it's opened;
// this asks straight away (useful on an iPhone, where a home-screen app can stay open for days).

let registration: ServiceWorkerRegistration | undefined;

export const setRegistration = (reg: ServiceWorkerRegistration | undefined) => {
  registration = reg;
};

export type UpdateResult = 'updating' | 'latest' | 'offline';

/** Looks for a newer version. If there is one, it installs and the app restarts by itself. */
export async function checkForUpdate(): Promise<UpdateResult> {
  if (!registration) return navigator.onLine ? 'latest' : 'offline';
  try {
    await registration.update();
  } catch {
    return 'offline';
  }
  return registration.installing || registration.waiting ? 'updating' : 'latest';
}
