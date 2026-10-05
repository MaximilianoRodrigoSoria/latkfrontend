import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.com.latk.app',
  appName: 'L.A TK',
  webDir: 'dist',
  plugins: {
    // Arranca PROTEGIDO (FLAG_SECURE en Android): la proteccion se apaga recien cuando
    // un ADMIN inicia sesion. Asi ningun hueco de tiempo queda sin cubrir.
    PrivacyScreen: {
      enable: true,
      preventScreenshots: true,
    },
  },
};

export default config;
