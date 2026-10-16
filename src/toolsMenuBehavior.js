const closeToolsMenu = event => {
  const menu = document.querySelector('[data-testid="tools-menu"]');
  if (!menu || !menu.hasAttribute('open')) return;
  if (menu.contains(event.target)) return;
  menu.removeAttribute('open');
};

const closeToolsMenuOnEscape = event => {
  if (event.key !== 'Escape') return;
  const menu = document.querySelector('[data-testid="tools-menu"]');
  if (menu?.hasAttribute('open')) {
    menu.removeAttribute('open');
    menu.querySelector('[data-testid="tools-menu-toggle"]')?.focus();
  }
};

document.addEventListener('pointerdown', closeToolsMenu);
document.addEventListener('keydown', closeToolsMenuOnEscape);
