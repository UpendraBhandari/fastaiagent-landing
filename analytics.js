// Google Analytics 4. The measurement ID is a public identifier, not a secret —
// it ships in the served HTML of every GA-instrumented site. Real secrets
// (Measurement Protocol api_secret, Data API service accounts) never belong here.
(function () {
  var ID = 'G-HDBM0DGTCR';
  if (ID.indexOf('XXXX') !== -1) return; // not configured yet — stay silent

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());

  // Pageviews are sent manually rather than automatically. post.html sets its
  // title only after the markdown loads, so an automatic pageview would report
  // every article as the placeholder title that was in the HTML at load time.
  gtag('config', ID, { send_page_view: false });

  function pageView(params) {
    var p = { page_title: document.title, page_location: location.href };
    if (params) for (var k in params) if (params[k] != null) p[k] = params[k];
    gtag('event', 'page_view', p);
  }
  window.FA_ANALYTICS = { pageView: pageView };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  // Pages that resolve their own title asynchronously set FA_DEFER_PAGEVIEW
  // before this script and call FA_ANALYTICS.pageView() when they are ready.
  if (!window.FA_DEFER_PAGEVIEW) pageView();
})();
