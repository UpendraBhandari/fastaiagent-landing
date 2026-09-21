// Google Analytics 4. The measurement ID is a public identifier, not a secret —
// it ships in the served HTML of every GA-instrumented site. Real secrets
// (Measurement Protocol api_secret, Data API service accounts) never belong here.
(function () {
  var ID = 'G-XXXXXXXXXX';
  if (ID.indexOf('XXXX') !== -1) return; // not configured yet — stay silent

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
})();
