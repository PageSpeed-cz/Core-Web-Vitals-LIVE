import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Core Web Vitals Live',
    description: "See your website's performance. Live. Real-time LCP, INP, and CLS metrics with visual overlays.",
    permissions: ['tabs', 'storage', 'activeTab'],
  },
});
