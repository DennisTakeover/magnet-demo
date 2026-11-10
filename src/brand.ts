/**
 * Two brands, one codebase. MAGNET is the international brand; Promoview serves the
 * Netherlands and Belgium. The brand follows the hostname (any host containing "promo"),
 * and `?brand=promoview` / `?brand=magnet` overrides it for previews.
 */
export type BrandId = 'magnet' | 'promoview';

function detect(): BrandId {
  try {
    const q = new URLSearchParams(window.location.search).get('brand');
    if (q === 'promoview' || q === 'magnet') {
      sessionStorage.setItem('brand', q);
      return q;
    }
    const saved = sessionStorage.getItem('brand');
    if (saved === 'promoview' || saved === 'magnet') return saved;
  } catch {
    /* storage unavailable */
  }
  return /promo/i.test(window.location.hostname) ? 'promoview' : 'magnet';
}

export const BRAND_ID: BrandId = detect();
export const IS_PROMOVIEW = BRAND_ID === 'promoview';

export const BRAND = IS_PROMOVIEW
  ? { id: BRAND_ID, name: 'Promoview', wordmark: 'promoview', title: 'Promoview · Instagram-groei met AI', storageKey: 'promoview-demo-state' }
  : { id: BRAND_ID, name: 'MAGNET', wordmark: 'magnet', title: 'MAGNET Demo', storageKey: 'magnet-demo-state' };

/** In the Promoview build every on-screen "MAGNET" becomes "Promoview". */
export function applyBrand() {
  document.documentElement.dataset.brand = BRAND_ID;
  document.title = BRAND.title;
  if (!IS_PROMOVIEW) return;
  const swap = (node: Node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const v = n.nodeValue;
      if (v && /MAGNET|magnet\b/.test(v) && !(n.parentElement?.closest('script,style,textarea,input'))) {
        n.nodeValue = v.replace(/MAGNET’s/g, 'Promoview’s').replace(/MAGNET/g, 'Promoview').replace(/\bmagnet\.app\b/g, 'promo-view.io').replace(/\bmagnet\b/g, 'promoview');
      }
    }
  };
  swap(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') { if (m.target.parentNode) swap(m.target.parentNode); } else m.addedNodes.forEach((a) => swap(a.nodeType === 3 && a.parentNode ? a.parentNode : a));
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
