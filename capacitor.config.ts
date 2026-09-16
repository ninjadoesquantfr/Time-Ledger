import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timeledger.app',
  appName: 'Time Ledger',
  webDir: 'public',
  server: {
    // Point this to your live Vercel URL once deployed to use the live cloud backend
    // url: 'https://your-time-ledger.vercel.app',
    cleartext: true,
  },
};

export default config;
