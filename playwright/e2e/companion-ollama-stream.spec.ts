import { expect, test } from '../fixtures';

test.use({ serviceWorkers: 'block' });

test('affiche la réflexion de Qwen immédiatement, puis les fragments de réponse avant la fin du flux', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const streamControls = window as Window & {
      __companionFirstAnswer?: () => void;
      __companionFinishAnswer?: () => void;
    };
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (!url.endsWith('/api/chat')) return nativeFetch(input, init);

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({
            message: { thinking: 'Je vérifie la couverture de la cartographie.' }, done: false,
          }) + '\n'));
          streamControls.__companionFirstAnswer = () => {
            controller.enqueue(encoder.encode(JSON.stringify({
              message: { content: 'Première conclusion.' }, done: false,
            }) + '\n'));
          };
          streamControls.__companionFinishAnswer = () => {
            controller.enqueue(encoder.encode(JSON.stringify({
              message: { content: ' Seconde conclusion.' }, done: true,
            }) + '\n'));
            controller.close();
          };
        },
      });
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }));
    };
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('companion-launcher').click();
  await page.getByTestId('companion-settings-toggle').click();
  await page.getByTestId('companion-provider-model').fill('qwen3.5:4b');
  await page.getByTestId('companion-provider-enabled').check();
  await page.getByTestId('companion-mode-conversation').click();
  await page.getByTestId('companion-question').fill('Quelle est la couverture de la carte ?');
  await page.getByTestId('companion-submit').click();

  const reasoning = page.getByTestId('companion-thinking-details');
  await expect(reasoning).toBeVisible();
  await expect(reasoning).toHaveAttribute('open');
  await expect(page.getByTestId('companion-thinking-content')).toContainText('Je vérifie la couverture');
  await expect(page.getByTestId('companion-thinking')).toBeVisible();

  await page.evaluate(() => {
    (window as Window & { __companionFirstAnswer?: () => void }).__companionFirstAnswer?.();
  });
  await expect(page.getByTestId('companion-answer')).toContainText('Première conclusion.');
  await expect(page.getByTestId('companion-streaming-note')).toBeVisible();

  await page.evaluate(() => {
    (window as Window & { __companionFinishAnswer?: () => void }).__companionFinishAnswer?.();
  });
  await expect(page.getByTestId('companion-answer')).toContainText('Première conclusion. Seconde conclusion.');
  await expect(page.getByTestId('companion-streaming-note')).toHaveCount(0);
  await expect(reasoning).not.toHaveAttribute('open');
  await reasoning.locator('summary').click();
  await expect(page.getByTestId('companion-thinking-content')).toContainText('Je vérifie la couverture');
});
