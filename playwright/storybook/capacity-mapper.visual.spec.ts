import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const storyUrl = (theme: 'light' | 'dark') =>
  `/iframe.html?id=application-capacity-mapper--desktop&viewMode=story&globals=theme:light`;

async function openCapacityMapper(page: import('@playwright/test').Page, width: number, height: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width, height });
  await page.goto(storyUrl(theme));
  await expect(page.locator('.app').first()).toBeVisible();
  const app = page.locator('.app').first();
  const isDark = await app.evaluate(element => element.classList.contains('theme-dark'));
  if (isDark !== (theme === 'dark')) {
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(app).toHaveClass(theme === 'dark' ? /theme-dark/ : /(?!.*theme-dark).*/);
    await page.keyboard.press('Escape');
  }
  // Keep the visual checks focused on the map and a stable sidebar position.
  await page.addStyleTag({ content: '.workspace aside#app-inventory { position: static !important; top: auto !important; height: auto !important; align-self: stretch !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

async function openUnifiedMapPresentation(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/iframe.html?id=application-capacity-mapper--unified-map-presentation&viewMode=story&globals=theme:light');
  await expect(page.locator('.app').first()).toBeVisible({ timeout: 15000 });
  if (theme === 'dark') {
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  const presentationPagePromise = page.context().waitForEvent('page');
  await page.getByTestId('presentation-switch-toolbar').click();
  await expect(page.getByTestId('presentation-switch-toolbar')).not.toBeChecked();
  const presentationPage = await presentationPagePromise;
  await presentationPage.waitForLoadState();
  await presentationPage.setViewportSize({ width: 1600, height: 900 });
  await expect(presentationPage.locator('.app.mosaic-presentation-mode .map-mosaic')).toBeVisible({ timeout: 15000 });
  await presentationPage.evaluate(() => document.fonts.ready);
  await presentationPage.waitForTimeout(200);
  return presentationPage;
}
test.describe('Storybook visual checks — Unified Capability Map', () => {
  test('cartographie présentation — paysage 16:9, thème clair', async ({ page }) => {
    const presentationPage = await openUnifiedMapPresentation(page, 'light');
    const mosaic = presentationPage.locator('.app.mosaic-presentation-mode .map-mosaic');
    await expect(mosaic).toHaveCSS('background-image', /radial-gradient/);
    await expect(mosaic.locator('.mosaic-domain')).not.toHaveCount(0);
    await expect(mosaic.locator('.mosaic-zone, .mosaic-column-heading, .mosaic-row-heading')).toHaveCount(0);
    const tracks = await mosaic.evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
    }));
    expect(tracks).toEqual({ columns: 3, rows: 2 });
    const hoveredCapability = mosaic.locator('.mosaic-domain .cap').first();
    await hoveredCapability.hover();
    await expect(hoveredCapability).toHaveCSS('animation-name', 'none');
    const hoverStyle = await hoveredCapability.evaluate(element => ({
      transitionProperty: getComputedStyle(element).transitionProperty,
      boxShadow: getComputedStyle(element).boxShadow,
    }));
    expect(hoverStyle.transitionProperty).toContain('background-color');
    expect(hoverStyle.boxShadow).toBe('none');
    const first = mosaic.locator('.mosaic-domain').first();
    await expect(first).toHaveCSS('border-style', 'solid');
    await expect(first.locator('.domain')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const cardBounds = await first.boundingBox();
    expect(cardBounds?.height ?? 0).toBeGreaterThan(180);
    const headingSize = await first.locator('.domain-banner h3').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(headingSize).toBeGreaterThan(16);
    const capabilitySize = await first.locator('.map-cap-select').first().evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(capabilitySize).toBeGreaterThan(12);
    await mkdir('playwright/storybook/__screenshots__', { recursive: true });
    await mkdir('test-results-storybook', { recursive: true });
    await presentationPage.screenshot({ path: 'playwright/storybook/__screenshots__/unified-map-presentation-landscape-light.png', animations: 'disabled' });
    await presentationPage.screenshot({ path: 'test-results-storybook/unified-map-presentation-landscape-light.png', animations: 'disabled' });
  });

  test('mosaïque présentation — paysage 16:9, thème sombre', async ({ page }) => {
    const presentationPage = await openUnifiedMapPresentation(page, 'dark');
    const mosaic = presentationPage.locator('.app.mosaic-presentation-mode .map-mosaic');
    await expect(mosaic.locator('.mosaic-domain').first()).toHaveCSS('border-style', 'solid');
    // Le thème de présentation doit reprendre le token SIGNAL, pas l'ancien graphite.
    const signalPresentationSurface = await mosaic.evaluate(element => {
      const probe = document.createElement('span');
      probe.style.background = 'var(--map-card-surface)';
      element.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    await expect(mosaic.locator('.mosaic-domain .domain').first()).toHaveCSS('background-color', signalPresentationSurface);
    const contrastRatios = await mosaic.locator('.domain-banner').evaluateAll(elements => elements.map(element => {
      const heading = element.querySelector('h3')!;
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const background = luminance(getComputedStyle(element).backgroundColor);
      const foreground = luminance(getComputedStyle(heading).color);
      return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
    }));
    expect(contrastRatios.every(ratio => ratio >= 4.5)).toBe(true);
    await mkdir('playwright/storybook/__screenshots__', { recursive: true });
    await mkdir('test-results-storybook', { recursive: true });
    await presentationPage.screenshot({ path: 'playwright/storybook/__screenshots__/unified-map-presentation-landscape-dark.png', animations: 'disabled' });
    await presentationPage.screenshot({ path: 'test-results-storybook/unified-map-presentation-landscape-dark.png', animations: 'disabled' });
  });
  for (const theme of ['light', 'dark'] as const) {
    test(`présentation — focus N0 sans transparence de carte, thème ${theme}`, async ({ page }) => {
      const presentationPage = await openUnifiedMapPresentation(page, theme);
      await page.getByTestId('presentation-director-toggle').click();
      await page.getByTestId('presentation-director-domain').selectOption({ index: 1 });
      const focused = presentationPage.locator('.mosaic-domain.is-presentation-focused');
      const dimmed = presentationPage.locator('.mosaic-domain.is-presentation-dimmed');
      await expect(focused).toHaveCount(1);
      await expect(dimmed.first()).toHaveCSS('opacity', '1');
      await mkdir('playwright/storybook/__screenshots__', { recursive: true });
      await mkdir('test-results-storybook', { recursive: true });
      await presentationPage.screenshot({
        path: `playwright/storybook/__screenshots__/unified-map-presentation-landscape-n0-focus-${theme}.png`,
        animations: 'disabled',
      });
      await presentationPage.screenshot({
        path: `test-results-storybook/unified-map-presentation-landscape-n0-focus-${theme}.png`,
        animations: 'disabled',
      });
    });
  }

  test('desktop — thème clair', async ({ page }) => {
    await openCapacityMapper(page, 1440, 900, 'light');
    const map = page.getByTestId('capability-map');
    await expect(map).toBeVisible();
    const mapTokens = await map.evaluate(element => {
      const styles = getComputedStyle(element);
      return {
        canvas: styles.getPropertyValue('--map-canvas-bg').trim(),
        gridDot: styles.getPropertyValue('--map-canvas-dot').trim(),
        cardSurface: styles.getPropertyValue('--map-card-surface').trim(),
        focus: styles.getPropertyValue('--color-focus').trim(),
      };
    });
    expect(mapTokens.canvas).not.toBe('');
    expect(mapTokens.gridDot).toContain('148');
    expect(mapTokens.cardSurface).toBe('#ffffff');
    expect(mapTokens.focus).not.toBe('');
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);
    await expect(map.locator('.mosaic-column-heading')).toHaveCount(4);
    await expect(map.locator('.mosaic-row-heading')).toHaveCount(3);
    const dimensions = await map.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    expect(dimensions.scrollHeight).toBeGreaterThanOrEqual(dimensions.clientHeight);
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/unified-map-desktop-light.png', animations: 'disabled' });
  });

  test('desktop — thème sombre avec surfaces discrètes', async ({ page }) => {
    await openCapacityMapper(page, 1440, 900, 'dark');
    const map = page.getByTestId('capability-map');
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);
    const mapTokens = await map.evaluate(element => {
      const styles = getComputedStyle(element);
      return {
        canvas: styles.getPropertyValue('--map-canvas-bg').trim(),
        gridDot: styles.getPropertyValue('--map-canvas-dot').trim(),
        cardSurface: styles.getPropertyValue('--map-card-surface').trim(),
        capabilityText: styles.getPropertyValue('--map-capability-text').trim(),
        signalSurface: styles.getPropertyValue('--signal-map-surface').trim(),
        signalText: styles.getPropertyValue('--color-text').trim(),
      };
    });
    expect(mapTokens.canvas).not.toBe('');
    expect(mapTokens.gridDot).toContain('9%');
    expect(mapTokens.cardSurface).toBe(mapTokens.signalSurface);
    expect(mapTokens.capabilityText).toBe(mapTokens.signalText);
    const zoneSurface = await map.locator('.mosaic-zone').first().evaluate(element => getComputedStyle(element).backgroundColor);
    const colorChannels = zoneSurface.match(/[\d.]+/g)?.map(Number) ?? [];
    const alpha = colorChannels.length === 4 ? colorChannels[3] : 1;
    expect(alpha).toBeLessThanOrEqual(0.3);
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/unified-map-desktop-dark.png', animations: 'disabled' });
  });

  test('mobile 390×844 — thème clair sans débordement horizontal', async ({ page }) => {
    await openCapacityMapper(page, 390, 844, 'light');
    const map = page.getByTestId('capability-map');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(map.locator('.mosaic-zone-mobile-label').first()).toBeVisible();
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);
    const tracks = await map.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(tracks).toBe(1);
    const firstDomain = await map.locator('.mosaic-domain').first().boundingBox();
    expect(firstDomain?.width ?? 0).toBeGreaterThan(320);
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/unified-map-mobile-light.png', animations: 'disabled' });
  });

  test('mobile 390×844 — thème sombre sans débordement horizontal', async ({ page }) => {
    await openCapacityMapper(page, 390, 844, 'dark');
    const map = page.getByTestId('capability-map');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(map.locator('.mosaic-zone-mobile-label').first()).toBeVisible();
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);
    const zoneSurface = await map.locator('.mosaic-zone').first().evaluate(element => getComputedStyle(element).backgroundColor);
    const channels = zoneSurface.match(/[\d.]+/g)?.map(Number) ?? [];
    expect(channels.length).toBe(4);
    expect(channels[3]).toBeLessThanOrEqual(0.3);
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/unified-map-mobile-dark.png', animations: 'disabled' });
  });

});

test('story réelle — accès aux nouvelles lectures métier, thème clair et sombre', async ({ page }) => {
  await openCapacityMapper(page, 1440, 900, 'light');
  const reading = page.getByTestId('capability-reading-toolbar');
  await expect(reading).toBeVisible();
  await page.getByTestId('map-reading-coverage').click();
  const capability = page.locator('.cap:visible').first();
  await expect(capability.getByTestId('capability-reading-detail')).toContainText('Couverture métier');
  await capability.getByTestId('capability-open-sheet').click();
  await expect(page.getByRole('dialog', { name: 'Fiche de capacité N1' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Fiche de capacité N1' }).getByRole('button', { name: '×' }).click();
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('.app.theme-dark')).toBeVisible();
  await page.getByTestId('map-reading-maturity').click();
  await expect(page.locator('.cap:visible').first().getByTestId('capability-reading-detail')).toContainText('Actuelle');
});

test('story réelle — la cartographie ouvre directement le diagnostic métier', async ({ page }) => {
  await openCapacityMapper(page, 1440, 900, 'light');
  await expect(page.getByTestId('capability-reading-summary')).toContainText('à qualifier');
  await page.getByTestId('capability-diagnostic-shortcut').click();
  await expect(page.getByTestId('capability-diagnostic')).toBeVisible();
  const item = page.getByTestId('capability-diagnostic-item').first();
  await expect(item.getByTestId('capability-diagnostic-edit')).toBeVisible();
});

test.describe('Design system — Points d’attention', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`diagnostic et revue · thème ${theme}`, async ({ page }) => {
      await openCapacityMapper(page, 1440, 900, theme);
      await page.getByTestId('nav-analysis').click();
      await page.getByTestId('dashboard-view-attention').click();
      const diagnosis = page.getByTestId('capability-diagnostic');
      const review = page.getByTestId('capability-decision-review');
      await expect(diagnosis).toBeVisible();
      await expect(review).toBeVisible();
      await expect(diagnosis.getByTestId('capability-diagnostic-item').first()).toBeVisible();
      await expect(diagnosis.getByTestId('attention-filter-signals')).toHaveAttribute('aria-pressed', 'true');
      const themedSurface = await diagnosis.getByTestId('capability-diagnostic-item').first().evaluate(element => {
        const probe = document.createElement('div');
        probe.style.background = 'var(--color-surface)';
        element.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { actual: getComputedStyle(element).backgroundColor, expected };
      });
      expect(themedSurface.actual).toBe(themedSurface.expected);
      await mkdir('test-results-storybook', { recursive: true });
      await page.screenshot({
        path: `test-results-storybook/attention-diagnostic-${theme}.png`,
        animations: 'disabled',
      });
      await diagnosis.getByTestId('attention-filter-qualification').click();
      await expect(diagnosis.getByTestId('attention-filter-qualification')).toHaveAttribute('aria-pressed', 'true');
      await diagnosis.getByTestId('attention-reference-toggle').click();
      await expect(diagnosis.getByTestId('capability-reference-url')).toBeVisible();
      await page.screenshot({
        path: `test-results-storybook/attention-reference-${theme}.png`,
        animations: 'disabled',
      });
      await review.getByTestId('retirement-application').selectOption('app-1');
      await expect(review.getByTestId('retirement-scenario')).toBeVisible();
      await review.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results-storybook/attention-review-${theme}.png`,
        animations: 'disabled',
      });
    });
  }

  test('mobile 390×844 · vue attention sans défilement horizontal', async ({ page }) => {
    await openCapacityMapper(page, 390, 844, 'light');
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    await expect(page.getByTestId('attention-filter-qualification')).toBeVisible();
    await page.getByTestId('attention-filter-qualification').click();
    await expect(page.getByTestId('capability-diagnostic-item').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/attention-mobile-light.png', animations: 'disabled' });
  });
});
