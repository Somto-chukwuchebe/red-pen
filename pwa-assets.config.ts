// Generates every icon and iPhone splash screen from public/icon.svg at build time.
import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

const cream = '#FBF5E9';
const charcoal = '#16181D';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      // The icon already has its own cream background and safe margins.
      maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: cream } },
      apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: cream } },
    },
    {
      padding: 0.35,
      resizeOptions: { background: cream, fit: 'contain' },
      darkResizeOptions: { background: charcoal, fit: 'contain' },
      linkMediaOptions: { log: false, addMediaScreen: true, xhtml: false },
      png: { compressionLevel: 9, quality: 60 },
    },
    // Every iPhone that can run iOS 16.4 or later.
    [
      'iPhone SE 4.7"', 'iPhone 8', 'iPhone 8 Plus', 'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
      'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone 12 mini', 'iPhone 12', 'iPhone 12 Pro Max',
      'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro Max', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro',
      'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16e',
      'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max', 'iPhone 17', 'iPhone Air',
      'iPhone 17 Pro', 'iPhone 17 Pro Max',
    ],
  ),
  images: ['public/icon.svg'],
});
