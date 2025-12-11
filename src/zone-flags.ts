/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
// eslint-disable-next-line no-underscore-dangle
(window as any).__Zone_disable_customElements = true;

/**
 * Disable passive event listener warnings from third-party libraries
 * These warnings come from Ionic/Stencil internal components (ion-segment, etc.)
 * and cannot be fixed from our application code
 */
// eslint-disable-next-line no-underscore-dangle
(window as any).__zone_symbol__PASSIVE_EVENTS = ['scroll', 'touchstart', 'touchmove', 'touchend', 'wheel'];
