/**
 * Dev-only proxy: forwards Firebase Functions emulator paths to port 5001.
 * Replaces the old package.json `"proxy"` (which incorrectly proxied logo/HMR files).
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

// (Function meaning): Read project id from `.env` at dev-server start, or use the same default as [.firebaserc].
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'lynkfiprod';

// (Function meaning): Only URLs that start with `/lynkfiprod/` (or your project id) go to the emulator; everything else stays on the React dev server.
const functionsEmulatorTarget =
  process.env.REACT_APP_FUNCTIONS_EMULATOR_ORIGIN || 'http://127.0.0.1:5001';

module.exports = function setupFirebaseFunctionsDevProxy(app) {
  app.use(
    `/${projectId}`,
    createProxyMiddleware({
      target: functionsEmulatorTarget.replace(/\/$/, ''),
      changeOrigin: true,
    }),
  );
};
