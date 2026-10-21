const enhanceNavigation = () => {
  const switcher = document.querySelector('.toolbar-switch');
  if (!switcher) return;
  const buttons = Array.from(switcher.querySelectorAll(':scope > button'));
  if (buttons.length < 4) return;
  const [editorButton, relationsButton, impactButton, dashboardButton] = buttons;
  const makeGroupLabel = (text, key) => {
    const label = document.createElement('span');
    label.className = 'primary-nav-group-label';
    label.dataset.navGroup = key;
    label.textContent = text;
    label.setAttribute('aria-hidden', 'true');
    return label;
  };
  switcher.dataset.navigationRationalized = 'true';
  switcher.setAttribute('aria-label', 'Navigation principale');
  editorButton.classList.add('primary-nav-item', 'primary-nav-editor');
  relationsButton.classList.add('primary-nav-item', 'primary-nav-analysis');
  impactButton.classList.add('primary-nav-item', 'primary-nav-analysis');
  dashboardButton.classList.add('primary-nav-item', 'primary-nav-analysis');
  if (!dashboardButton.querySelector('small') || !dashboardButton.textContent.includes('Analyse')) {
    dashboardButton.innerHTML = '<span>▥ Analyse</span><small>Dashboard</small>';
    dashboardButton.setAttribute('aria-label', 'Analyse — Dashboard');
    dashboardButton.title = 'Analyse — Dashboard';
  }
  if (!switcher.querySelector('[data-nav-group="build"]')) switcher.insertBefore(makeGroupLabel('Construire', 'build'), editorButton);
  if (!switcher.querySelector('[data-nav-group="analysis"]')) switcher.insertBefore(makeGroupLabel('Analyser', 'analysis'), relationsButton);
  if (!switcher.querySelector('[data-testid="primary-library"]')) {
    const libraryButton = document.createElement('button');
    libraryButton.type = 'button';
    libraryButton.className = 'primary-nav-item primary-nav-library';
    libraryButton.dataset.testid = 'primary-library';
    libraryButton.textContent = '▤ Bibliothèque';
    libraryButton.setAttribute('aria-label', 'Bibliothèque — Mes cartographies');
    libraryButton.title = 'Ouvrir mes cartographies';
    libraryButton.addEventListener('click', () => document.querySelector('[data-testid="open-local-maps"]')?.click());
    switcher.append(makeGroupLabel('Gérer', 'manage'), libraryButton);
  }
};
const startNavigationRationalization = () => {
  enhanceNavigation();
  const observer = new MutationObserver(enhanceNavigation);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startNavigationRationalization, { once: true });
else startNavigationRationalization();
