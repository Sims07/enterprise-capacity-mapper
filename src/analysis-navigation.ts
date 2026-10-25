const TARGET_SELECTOR = '.tree-row.impact-highlight';
const MAX_ATTEMPTS = 20;

const scrollToSelectedTarget = () => {
  let attempts = 0;
  const tryScroll = () => {
    const target = document.querySelector<HTMLElement>(TARGET_SELECTOR);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      target.setAttribute('data-navigation-focused', 'true');
      window.setTimeout(() => target.removeAttribute('data-navigation-focused'), 1200);
      return;
    }
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) window.setTimeout(tryScroll, 50);
  };
  tryScroll();
};

document.addEventListener('click', event => {
  const origin = event.target;
  if (!(origin instanceof Element)) return;
  const target = origin.closest('.dashboard-target, .dashboard-map-capability, .dashboard-gap-domain-list button');
  if (!target) return;
  window.setTimeout(scrollToSelectedTarget, 0);
}, true);
