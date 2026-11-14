// Global site tag (gtag.js) - Google Analytics -->
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());
gtag(
  'config', window._env_.REACT_APP_GA_MEASUREMENT_ID, {
  'send_page_view': false
});

if (window._env_.REACT_APP_GA_MEASUREMENT_ID) {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' +
    encodeURIComponent(window._env_.REACT_APP_GA_MEASUREMENT_ID);
  document.head.appendChild(script);
}
