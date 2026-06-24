/** Dedicated mount node for mobile/tablet drawer overlays — always above #root. */

const PORTAL_ID = 'sx-app-drawer-portal';

export function getDrawerPortalNode(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('drawer portal requires document');
  }
  let el = document.getElementById(PORTAL_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = PORTAL_ID;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}
