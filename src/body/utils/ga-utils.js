// import { gtag } from '/ga-config'
import ReactGA from 'react-ga';

function hasAnalyticsId(){
  return (window._env_.GA_TRACKING_ID !== "")
}

function hasMeasurementId(){
  return (window._env_.REACT_APP_GA_MEASUREMENT_ID !== "")
}

// function sendPageView(url, title, pathname, query_string){
function sendPageView(){
  const url = window.location.href
  const title = document.title
  const pathname = window.location.pathname
  const query_string = window.location.search
  gtag('event', 'page_view', {
    page_location: url,
    page_path: pathname+query_string,
    page_title: title,
  });
}

function sendRegisterClickEvent(pageType){
  if (hasAnalyticsId()) {
    ReactGA.event({
      category: 'Registration',
      action: 'linkClick',
      label: pageType,
    })
  }
}


export {
  hasAnalyticsId, 
  hasMeasurementId, 
  sendPageView, 
  sendRegisterClickEvent
};