const roles = {
  seller: 'Vendedor',
  admin: 'Administrador',
  operator: 'Operador',
  auditor: 'Auditor',
};
const role = process.env.LATK_DOCS_ROLE;
if (!Object.hasOwn(roles, role ?? ''))
  throw new Error('Indicá un rol: seller, admin, operator o auditor.');

export default {
  title: `LATK · ${roles[role]}`,
  tagline: 'Documentación de flujos',
  url: process.env.LATK_DOCS_URL || 'http://localhost:3000',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  i18n: { defaultLocale: 'es', locales: ['es'] },
  presets: [
    [
      'classic',
      {
        docs: { path: `../content/${role}`, routeBasePath: '/', sidebarPath: './sidebars.js' },
        blog: false,
        sitemap: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: { title: `LATK · ${roles[role]}`, items: [] },
    colorMode: { respectPrefersColorScheme: true },
  },
};
