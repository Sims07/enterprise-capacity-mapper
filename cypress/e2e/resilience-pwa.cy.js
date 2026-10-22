describe('Lot 5 — résilience du stockage et mise à jour PWA', () => {
  const MODEL_KEY = 'enterprise-capacity-mapper:model:v3';
  const LOCAL_MAPS_KEY = 'enterprise-capacity-mapper:local-maps:v1';
  const RECENT_MAPS_KEY = 'enterprise-capacity-mapper:recent-maps:v1';
  const ACTIVE_RECENT_MAP_KEY = 'enterprise-capacity-mapper:active-recent-map';

  const visit = onBeforeLoad => {
    cy.visit('/', { onBeforeLoad });
  };

  const openTools = () => cy.get('[data-testid="tools-menu-toggle"]').click();

  it('reste fonctionnelle si le modèle local est corrompu', () => {
    visit(win => {
      win.localStorage.setItem(MODEL_KEY, '{not-json');
    });

    cy.get('[data-testid="nav-cartography"]').should('have.attr', 'aria-current', 'page');
    cy.get('.map-cell').should('exist');
    cy.contains('Capacity Mapper').should('be.visible');
  });

  it('migre un modèle legacy vers le schéma actuel', () => {
    visit(win => {
      win.localStorage.removeItem(MODEL_KEY);
      win.localStorage.setItem('ea_canvas_l0', JSON.stringify([
        { id: 'legacy-domain', name: 'Domaine historique', code: 'LEG-0', description: 'Domaine migré', color: 'indigo' }
      ]));
      win.localStorage.setItem('ea_canvas_l1', JSON.stringify([
        { id: 'legacy-cap', name: 'Capacité historique', code: 'LEG-1', description: 'Capacité migrée', l0Id: 'legacy-domain' }
      ]));
      win.localStorage.setItem('ea_canvas_apps', JSON.stringify([
        { id: 'legacy-app', name: 'Application historique', code: 'LEG-APP', type: 'SaaS', status: 'Actif', vendor: 'Legacy', description: 'Application migrée', l1Id: 'legacy-cap' }
      ]));
    });

    cy.contains('.domain-banner', 'Domaine historique').should('be.visible');
    cy.contains('.cap', 'Capacité historique').should('be.visible');
    cy.contains('.app-item', 'Application historique').should('be.visible');
    cy.window().then(win => {
      const migrated = JSON.parse(win.localStorage.getItem(MODEL_KEY));
      expect(migrated.schemaVersion).to.equal(3);
      expect(migrated.capabilities[0].domainId).to.equal('legacy-domain');
      expect(migrated.applications[0].capabilityIds).to.deep.equal(['legacy-cap']);
    });
  });

  it('signale les bibliothèques locales invalides sans bloquer la navigation', () => {
    visit(win => {
      win.localStorage.setItem(LOCAL_MAPS_KEY, JSON.stringify({ invalid: true }));
      win.localStorage.setItem(RECENT_MAPS_KEY, JSON.stringify({ invalid: true }));
      // Empêche l'effet de synchronisation du récent actif de lire la collection
      // corrompue avant que openLibrary puisse exercer son propre chemin de récupération.
      win.localStorage.setItem(ACTIVE_RECENT_MAP_KEY, '__dismissed__');
    });

    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-count"]').should('contain.text', '0');
    cy.get('[data-testid="recent-maps-count"]').should('contain.text', '0');
    cy.get('.toast').should('contain.text', 'Certaines données locales sont invalides');
  });

  it('affiche une indisponibilité lorsque le service worker ne peut pas être enregistré', () => {
    visit(win => {
      Object.defineProperty(win.navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          register: () => Promise.reject(new Error('service worker indisponible')),
          getRegistration: () => Promise.resolve(undefined)
        }
      });
    });

    openTools();
    cy.get('[data-testid="pwa-version"]').should('be.visible');
    cy.get('[data-testid="pwa-version"] .pwa-update-button').should('not.exist');
    cy.get('[data-testid="pwa-version"] .pwa-update-message')
      .should('contain.text', 'Mise à jour indisponible pour le moment.');
  });

  it('propose puis déclenche une mise à jour lorsqu’un worker est en attente', () => {
    const waitingWorker = { postMessage: cy.stub().as('postMessage') };
    const registration = {
      waiting: waitingWorker,
      installing: null,
      addEventListener: () => {},
      update: cy.stub().resolves()
    };

    visit(win => {
      Object.defineProperty(win.navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: {},
          addEventListener: () => {},
          removeEventListener: () => {},
          register: () => Promise.resolve(registration),
          getRegistration: () => Promise.resolve(registration)
        }
      });
    });

    openTools();
    cy.get('[data-testid="pwa-update-button"]')
      .should('be.visible')
      .click();
    cy.get('@postMessage').should('have.been.calledWith', { type: 'SKIP_WAITING' });
    cy.get('.pwa-update-message')
      .should('contain.text', 'Installation de la mise à jour');
  });
});
