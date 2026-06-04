import type { Plugin } from 'vite';

/** Injects build id into index.html so phones purge stale SW/cache after deploy */
export function sqBuildMetaPlugin(): Plugin {
  const buildId = `${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

  return {
    name: 'sq-build-meta',
    config() {
      return {
        define: {
          __SQ_BUILD_ID__: JSON.stringify(buildId),
        },
      };
    },
    transformIndexHtml(html) {
      const purgeScript = `<script>(function(){try{var m=document.querySelector('meta[name="sq-build"]');var b=m&&m.getAttribute('content');var k='schoolixiq_build_id';var p=localStorage.getItem(k);if(b&&p&&p!==b){localStorage.setItem(k,b);localStorage.removeItem('schoolixiq_system_config');localStorage.removeItem('schoolixiq_brand_asset_version');if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister();}));}).then(function(){if(window.caches){return caches.keys().then(function(keys){return Promise.all(keys.map(function(c){return caches.delete(c);}));});}}).finally(function(){location.reload();});}else{location.reload();}}else if(b){localStorage.setItem(k,b);}}catch(e){}})();</script>`;
      const googleClientId =
        process.env.VITE_GOOGLE_CLIENT_ID ||
        '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com';
      const googleMeta = `<meta name="google-signin-client_id" content="${googleClientId}" />`;

      return html
        .replace(
          '<head>',
          `<head>\n    <meta name="sq-build" content="${buildId}" />\n    ${googleMeta}`,
        )
        .replace('</head>', `${purgeScript}\n  </head>`)
        .replace(/\/logo\.png\?v=[^"']+/g, `/logo.png?v=${buildId}`)
        .replace(
          'href="/manifest.json"',
          `href="/manifest.json?v=${buildId}"`,
        );
    },
  };
}
