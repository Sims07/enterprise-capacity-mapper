describe('Compagnon cartographe — interface locale', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('ouvre le panneau accessible et présente les deux modes', () => {
    cy.get('[data-testid="companion-launcher"]').should('be.visible').and('have.attr', 'aria-expanded', 'false').click();
    cy.get('[data-testid="companion-panel"]').should('be.visible').and('have.attr', 'role', 'dialog');
    cy.contains('[data-testid="companion-panel"]', 'aucune donnée transmise').should('be.visible');
    cy.get('[data-testid="companion-mode-guided"]').should('be.visible').and('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="companion-mode-conversation"]').should('be.visible').and('have.attr', 'aria-pressed', 'false');
    ['overview', 'coverage', 'naming', 'structure'].forEach(id => cy.get(`[data-testid="companion-prompt-${id}"]`).should('be.visible'));
  });

  it('garde les questions guidées fixes et accessibles après plusieurs contrôles', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();
    cy.get('[data-testid="companion-chat-history"]').should('be.visible');
    cy.get('[data-testid="companion-exchange"]').should('have.length', 1);
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');
    cy.get('[data-testid="companion-conversation"]').scrollTo('bottom');
    cy.get('[data-testid="companion-prompt-naming"]').should('be.visible').click();
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('[data-testid="companion-user-question"]').eq(0).should('contain.text', 'Vérifier la couverture');
    cy.get('[data-testid="companion-user-question"]').eq(1).should('contain.text', 'Revoir le nommage métier');
    cy.get('[data-testid="companion-prompt-structure"]').should('be.visible');
  });

  it('permet de supprimer un échange avec confirmation', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();
    cy.get('[data-testid="companion-prompt-naming"]').click();
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('[data-testid="companion-delete-exchange"]').first().click();
    cy.get('[data-testid="companion-confirm-delete-exchange"]').click();
    cy.get('[data-testid="companion-exchange"]').should('have.length', 1);
    cy.get('[data-testid="companion-user-question"]').should('contain.text', 'Revoir le nommage métier');
  });

  it('permet de réinitialiser tout l’historique avec confirmation', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();
    cy.get('[data-testid="companion-prompt-naming"]').click();
    cy.get('[data-testid="companion-clear-history"]').click();
    cy.get('[data-testid="companion-confirm-clear"]').click();
    cy.get('[data-testid="companion-exchange"]').should('not.exist');
    cy.get('[data-testid="companion-clear-history"]').should('not.exist');
    cy.get('[data-testid="companion-prompt-overview"]').should('be.visible');
  });

  it('permet de passer du mode guidé au mode conversation sans perdre l’historique', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="companion-prompt-coverage"]').should('not.exist');
    cy.get('[data-testid="companion-question"]').type('Peux-tu revoir le nommage des capacités ?');
    cy.get('[data-testid="companion-submit"]').click();
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('[data-testid="companion-user-question"]').eq(1).should('contain.text', 'Peux-tu revoir le nommage des capacités ?');
    cy.get('[data-testid="companion-mode-guided"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('body').type('{esc}');
    cy.get('[data-testid="companion-panel"]').should('not.exist');
    cy.get('[data-testid="companion-launcher"]').should('have.focus');
  });

  it('répond à une question ciblée sur les capacités rattachées à une application', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-question"]').type('À quelles capacités SAP S/4HANA Finance est-elle rattachée ?');
    cy.get('[data-testid="companion-submit"]').click();
    cy.get('[data-testid="companion-answer"]').should('contain.text', 'rattachement(s) déclaré(s)');
    cy.get('[data-testid="companion-exchange"]').last().within(() => {
      cy.contains('Capacité associée : Comptabilité Générale').should('exist');
      cy.contains('Capacité associée : Facturation & Recouvrement').should('exist');
      cy.contains('Capacité associée : Gestion de Trésorerie').should('exist');
      cy.contains('Finance, Gestion & Comptabilité').should('exist');
    });
  });

  it('répond à une question sur les applications qui soutiennent une capacité', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-question"]').type('Quelles applications sont reliées à Facturation & Recouvrement ?');
    cy.get('[data-testid="companion-submit"]').click();
    cy.get('[data-testid="companion-answer"]').should('contain.text', 'relation(s) applicative(s)');
    cy.get('[data-testid="companion-exchange"]').last().within(() => {
      cy.contains('Application associée : SAP S/4HANA Finance').should('exist');
      cy.contains('Application associée : Odoo Invoice').should('exist');
    });
  });

  it('indique clairement quand le nom demandé ne correspond à aucun élément', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-question"]').type('Où se trouve l’application Inventée XYZ dans la cartographie ?');
    cy.get('[data-testid="companion-submit"]').click();
    cy.get('[data-testid="companion-answer"]').should('contain.text', 'je ne trouve pas de nom');
    cy.contains('Élément à identifier').should('exist');
  });

  it('reste lisible en thème sombre sans assertion fragile sur les valeurs RGB', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app.theme-dark .companion-panel').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-heading h2').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-prompt').first().should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-mode-switch').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-composer input').should('not.exist');
  });

  it('ne déborde pas de la fenêtre sur mobile', () => {
    cy.viewport(390, 740);
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-panel"]').should('be.visible').then(panel => {
      const rect = panel[0].getBoundingClientRect();
      expect(rect.left, 'bord gauche du panneau').to.be.at.least(0);
      expect(rect.right, 'bord droit du panneau').to.be.at.most(390);
      expect(rect.bottom, 'bas du panneau').to.be.at.most(740);
    });
  });

  it('explique la configuration CORS requise pour Ollama sur GitHub Pages', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-settings-toggle"]').click();
    cy.get('[data-testid="companion-ollama-cors-help"]').should('be.visible')
      .and('contain.text', 'https://sims07.github.io')
      .and('contain.text', 'OLLAMA_ORIGINS')
      .and('contain.text', 'localhost désigne le téléphone');
    cy.get('[data-testid="companion-ollama-cors-help"]').find('summary').click();
    cy.get('[data-testid="companion-ollama-cors-help"]').should('have.attr', 'open');
    cy.get('[data-testid="companion-provider"]').select('openai');
    cy.get('[data-testid="companion-ollama-cors-help"]').should('not.exist');
  });

  it('configure Ollama et utilise une réponse simulée dans le mode Conversation', () => {
    cy.intercept('OPTIONS', 'http://localhost:11434/api/chat', {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': 'http://127.0.0.1:4173',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
    cy.intercept('POST', 'http://localhost:11434/api/chat', {
      statusCode: 200,
      headers: { 'access-control-allow-origin': 'http://127.0.0.1:4173' },
      body: { message: { content: 'Réponse Ollama simulée : la couverture doit être validée par un architecte.' } },
      delay: 500,
    }).as('ollamaChat');

    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-settings-toggle"]').click();
    cy.get('[data-testid="companion-provider-settings"]').should('be.visible');
    cy.get('[data-testid="companion-provider"]').should('have.value', 'ollama');
    cy.get('[data-testid="companion-provider-enabled"]').check();
    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-question"]').type('Évalue la couverture de cette cartographie');
    cy.get('[data-testid="companion-submit"]').click();

    cy.get('[data-testid="companion-thinking"]').should('be.visible').and('contain.text', 'Le modèle prépare sa réponse');
    cy.wait('@ollamaChat').its('request.body.messages').should('have.length.at.least', 2);
    cy.get('[data-testid="companion-answer"]').should('contain.text', 'Réponse Ollama simulée');
    cy.get('[data-testid="companion-exchange"]').last().find('.companion-no-findings').should('not.exist');
    cy.get('[data-testid="companion-panel"]').should('contain.text', 'Fournisseur actif : Ollama (local)');
  });

  it('ne persiste jamais une clé API cloud dans les préférences locales', () => {
    const apiKey = 'cle-api-fictive-ne-pas-enregistrer';
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-settings-toggle"]').click();
    cy.get('[data-testid="companion-provider"]').select('openai');
    cy.get('[data-testid="companion-provider-key"]').type(apiKey);
    cy.get('[data-testid="companion-provider-enabled"]').check();
    cy.window().should(window => {
      const saved = window.localStorage.getItem('enterprise-capacity-mapper:companion-provider-preferences') || '';
      expect(saved).not.to.contain(apiKey);
      expect(saved).to.contain('"provider":"openai"');
    });
    cy.get('[data-testid="companion-provider-clear-key"]').click();
    cy.get('[data-testid="companion-provider-key"]').should('have.value', '');
  });
});
