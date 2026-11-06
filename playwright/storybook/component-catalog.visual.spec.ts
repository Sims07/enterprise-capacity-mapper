import { expect, test } from '@playwright/test';

const story = (id: string, theme: 'light' | 'dark' = 'light') =>
  '/iframe.html?id=' + id + '&viewMode=story&globals=theme:' + theme;

test('les champs sont accessibles, y compris la validation et le thème sombre', async ({ page }) => {
  await page.goto(story('design-system-formulaires--validation', 'dark'));
  const field = page.getByRole('textbox', { name: /Nom de la capacité/ });
  await expect(field).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAttribute('aria-describedby', /-error/);
  await expect(page.getByText('Le nom de la capacité est obligatoire.')).toBeVisible();
  await expect(page.locator('.app.signal-experience.theme-dark')).toBeVisible();
});

test('les listes déroulantes fonctionnent et les contrôles désactivés sont natifs', async ({ page }) => {
  await page.goto(story('design-system-formulaires--dropdowns'));
  await page.getByRole('combobox', { name: 'Priorité' }).selectOption('P1');
  await expect(page.getByRole('combobox', { name: 'Priorité' })).toHaveValue('P1');
  await expect(page.getByRole('combobox', { name: 'Application indisponible' })).toBeDisabled();
});

test('un formulaire réagit à une erreur puis à une saisie valide', async ({ page }) => {
  await page.goto(story('design-system-formulaires--parcours-de-formulaire'));
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByText('Ce nom est obligatoire.')).toBeVisible();
  await page.getByRole('textbox', { name: /Nom/ }).fill('Portail client');
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Formulaire valide' })).toBeVisible();
});

test('la modale partagée se ferme par Escape et peut être réouverte', async ({ page }) => {
  await page.goto(story('design-system-superpositions-et-messages--confirmation'));
  await expect(page.getByRole('dialog', { name: 'Ouvrir une cartographie' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ouvrir la confirmation' }).click();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('le menu déroulant gère ouverture, sélection et Escape', async ({ page }) => {
  await page.goto(story('design-system-actions-et-navigation--menu-deroulant'));
  const toggle = page.getByRole('button', { name: /Outils/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Exporter en JSON' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('status')).toContainText('Export JSON');
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('le vrai assistant permet de parcourir les étapes sans modifier les données', async ({ page }) => {
  await page.goto(story('application-modules-metier--assistant-de-creation'));
  await expect(page.getByRole('dialog', { name: 'Nouvelle cartographie' })).toBeVisible();
  await page.getByTestId('wizard-name').fill('Cartographie de référence');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByTestId('wizard-step-2')).toBeVisible();
  await expect(page.getByTestId('wizard-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(page.getByTestId('wizard-name')).toHaveValue('Cartographie de référence');
});


test('la fenêtre garde le focus et le rend au déclencheur après Escape', async ({ page }) => {
  await page.goto(story('design-system-superpositions-et-messages--confirmation'));
  const initialDialog = page.getByRole('dialog', { name: 'Ouvrir une cartographie' });
  await expect(initialDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(initialDialog).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Ouvrir la confirmation' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Ouvrir une cartographie' });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Fermer la fenêtre' });
  await close.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('la validation reste lisible et identifiée en thème sombre', async ({ page }) => {
  await page.goto(story('design-system-formulaires--validation', 'dark'));
  const input = page.getByRole('textbox', { name: /Nom de la capacité/ });
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.app.signal-experience.theme-dark')).toHaveCSS('color-scheme', 'dark');
  await expect(page.getByText('Le nom de la capacité est obligatoire.')).toBeVisible();
});

test('la légende de restitution explique la couverture et les écarts dans les deux thèmes', async ({ page }) => {
  await page.goto(story('design-system-legende-de-presentation--couverture', 'dark'));
  await expect(page.locator('.app.signal-experience.theme-dark')).toBeVisible();
  const legend = page.getByTestId('presentation-legend');
  await expect(legend).toContainText('Non couverte');
  await expect(legend).toContainText('Partielle');
  await expect(legend).not.toContainText('Intermédiaire');
  await page.goto(story('design-system-legende-de-presentation--ecarts'));
  await expect(page.getByTestId('presentation-legend')).toContainText('Aucun signal détecté');
});

test('le panneau Affichage Signal n’ajoute pas de barre permanente et reste pilotable au clavier', async ({ page }) => {
  await page.goto(story('design-system-affichage-cartographie--couverture', 'dark'));
  const disclosure = page.getByTestId('map-reading-disclosure');
  const legend = page.getByTestId('map-reading-legend');
  await expect(disclosure).toBeVisible();
  await expect(legend).toBeHidden();
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(legend).toBeVisible();
  await expect(legend).toContainText('Non couverte');
  await disclosure.getByTestId('map-density').selectOption('compact');
  await expect(page.getByRole('status')).toContainText('compact');
  await page.keyboard.press('Escape');
  await expect(legend).toBeHidden();
  await expect(disclosure.locator('summary')).toBeFocused();
});
