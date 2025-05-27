import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/favicon.png" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EmoSpend" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="EmoSpend" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-tap-highlight" content="no" />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('Checking for service worker support...');
              if ('serviceWorker' in navigator) {
                console.log('Service Worker is supported');
                window.addEventListener('load', function() {
                  console.log('Registering service worker...');
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                      // Debug beforeinstallprompt event
                      window.addEventListener('beforeinstallprompt', (e) => {
                        console.log('beforeinstallprompt event fired');
                        // Show your custom install button here if needed
                      });
                    },
                    function(err) {
                      console.error('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              } else {
                console.log('Service Worker is not supported in this browser');
              }
            `,
          }}
        />
        {/* Debug PWA Install Prompt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', (e) => {
                console.log('beforeinstallprompt event fired');
                // You can uncomment the following line to see the install prompt
                // e.prompt();
              });
              
              // Log PWA installation
              window.addEventListener('appinstalled', (evt) => {
                console.log('App was installed', evt);
              });
              
              // Check if app is running in standalone mode
              const isInStandalone = () => 
                (window.matchMedia('(display-mode: standalone)').matches) || 
                (window.navigator.standalone) ||
                document.referrer.includes('android-app://');
                
              console.log('Is running in standalone mode:', isInStandalone());
            `,
          }}
        />
      </body>
    </Html>
  );
}
