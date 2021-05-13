// Global site tag (gtag.js) - Google Analytics -->
window.dataLayer = window.dataLayer || [];
gtag = function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag(
  'config', window._env_.REACT_APP_GA_MEASUREMENT_ID, {
  'send_page_view': false
});
