import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Studcraft";

const EXTENSION_ERROR_GUARD_SCRIPT = `(function(){
  function isExtensionError(msg, stack, filename) {
    var s = String(msg || '') + ' ' + String(stack || '') + ' ' + String(filename || '');
    return s.indexOf('chrome-extension://') !== -1 ||
           s.indexOf('moz-extension://') !== -1 ||
           s.indexOf('safari-web-extension://') !== -1 ||
           s.indexOf('Failed to connect to MetaMask') !== -1;
  }
  window.addEventListener('error', function(e) {
    var err = e && e.error;
    if (isExtensionError(e && e.message, err && err.stack, e && e.filename)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var r = e && e.reason;
    var msg = r && (r.message || String(r));
    var stack = r && r.stack;
    if (isExtensionError(msg, stack, '')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "Studcraft is a brick sandbox. Mine the hills, snap the pieces, keep the world." },
      { name: "theme-color", content: "#1C140E" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EXTENSION_ERROR_GUARD_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
