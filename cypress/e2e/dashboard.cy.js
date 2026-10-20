describe('Dashboard de couverture', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('présente des indicateurs calculés depuis la cartographie active', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="tab-impact"]').next('[data-testid="tab-dashboard"]').should('exist');
    cy.get('[data-testid="capability-dashboard"]').should('have.attr', 'aria-label', 'Dashboard de couverture');
    cy.get('[data-testid="dashboard-coverage-rate"]').should('contain.text', '%');
    cy.get('[data-testid="dashboard-gap-count"]').invoke('text').then(value => {
      expect(Number(value.trim())).to.be.greaterThan(0);
    });
    cy.get('[data-testid="dashboard-redundancy-count"]').invoke('text').then(value => {
      expect(Number(value.trim())).to.be.at.least(0);
    });
    cy.get('.dashboard-domain-row').should('have.length.greaterThan', 0);
    cy.get('.dashboard-progress[role="progressbar"]').should('have.attr', 'aria-valuenow');
  });

  it('affiche la heatmap dans la même matrice de positionnement que la cartographie', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('be.visible');
    cy.get('[data-testid="dashboard-map-layout"]').should('be.visible');
    cy.get('.dashboard-map-column-headings span').should('have.length', 4)
      .then($headings => expect([...$headings].map(el => el.textContent.trim())).to.deep.equal(['Client', 'Produit', 'Opérations', 'Support']));
    cy.get('.dashboard-map-layer-label').should('have.length', 3)
      .then($labels => expect([...$labels].map(el => el.textContent.trim())).to.deep.equal(['Stratégique', 'Core / Value', 'Support']));
    cy.get('.dashboard-map-domain[data-domain-id="l0-1"]').should('exist')
      .closest('.dashboard-map-cell').should('have.attr', 'data-column', 'customer').and('have.attr', 'data-layer', 'core');
    cy.get('.dashboard-map-domain[data-domain-id="l0-2"]').should('exist')
      .closest('.dashboard-map-cell').should('have.attr', 'data-column', 'support').and('have.attr', 'data-layer', 'support');
    cy.get('.dashboard-map-domain[data-domain-id="l0-3"]').should('exist')
      .closest('.dashboard-map-cell').should('have.attr', 'data-column', 'operations').and('have.attr', 'data-layer', 'core');
    cy.get('.dashboard-map-domain[data-domain-id="l0-4"]').should('exist')
      .closest('.dashboard-map-cell').should('have.attr', 'data-column', 'support').and('have.attr', 'data-layer', 'support');
    cy.get('.dashboard-map-capability').should('have.length', 10);
    cy.get('.dashboard-map-capability').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
  });

  it('respecte les domaines N0 étendus sur plusieurs colonnes dans la heatmap', () => {
    cy.get('.mini-action-trigger[aria-label="Actions pour Relation & Engagement Client"]').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label.field', 'Étendue sur les colonnes').find('select').select('2');
      cy.contains('button', 'Enregistrer').click();
    });

    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-domain[data-domain-id="l0-1"]')
      .closest('.dashboard-map-cell')
      .should('have.attr', 'data-column', 'customer')
      .and('have.attr', 'data-layer', 'core')
      .and('have.attr', 'style')
      .and('contain', 'grid-column: span 2');
    cy.get('.dashboard-map-row[data-layer="core"] .dashboard-map-cell[data-column="product"]')
      .should('not.exist');
    cy.get('.dashboard-map-column-headings span').should('have.length', 4);
  });
  it('permet de modifier la criticité de toute capacité N1 directement depuis la heatmap', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();

    cy.get('.dashboard-map-capability').first().then($button => {
      const label = $button.find('.dashboard-map-capability-name').text().trim();
      const row = $button.closest('.dashboard-map-capability-row');
      const select = row.find('select[data-testid^="dashboard-map-priority-select-"]');
      expect(select, `sélecteur de criticité pour ${label}`).to.have.length(1);
      cy.wrap(select).select('P1');
      cy.wrap(select).should('have.value', 'P1');
      cy.window().then(win => {
        const saved = JSON.parse(win.localStorage.getItem('enterprise-capacity-mapper:model:v3'));
        const capabilityId = select.attr('data-testid').replace('dashboard-map-priority-select-', '');
        expect(saved.capabilities.find(capability => capability.id === capabilityId).priority).to.equal('P1');
      });
    });
  });

  it('identifie une application sans relation et permet de la relier depuis le dashboard', () => {
    cy.get('.side-add').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label.field', /^Nom/).find('input').type('Application orpheline test');
      cy.contains('label.field', /^Code/).find('input').type('APP-ORPHELINE');
      cy.contains('label.field', /Éditeur \/ fournisseur/).find('input').type('Éditeur test');
      cy.contains('button', 'Créer').click();
    });

    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]').within(() => {
      cy.contains('Application orpheline test').should('be.visible');
      cy.get('button[aria-label="Relier Application orpheline test à des capacités N1"]').click();
    });

    cy.get('[role="dialog"]').should('contain.text', 'Relier « Application orpheline test »');
    cy.get('[data-testid="link-list"] input[type="checkbox"]').first().check();
    cy.get('[data-testid="link-save"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]')
      .should('contain.text', 'Toutes les applications sont reliées')
      .and('not.contain.text', 'Application orpheline test');
  });

  it('garde les quatre onglets principaux sur une seule ligne sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('.toolbar-switch > button').should('have.length', 4).then($tabs => {
      const tops = [...$tabs].map(tab => tab.getBoundingClientRect().top);
      expect(Math.max(...tops) - Math.min(...tops)).to.be.lessThan(1);
    });
  });

  it('garde le surlignage actif sur l’onglet sélectionné', () => {
    const tabs = ['[data-testid="tab-relations"]', '[data-testid="tab-impact"]', '[data-testid="tab-dashboard"]'];
    tabs.forEach(selector => {
      cy.get(selector).click().should('have.class', 'active');
      cy.get('.toolbar-switch > button.active').should('have.length', 1).and('have.attr', 'data-testid').and('equal', selector.match(/tab-[a-z]+/)[0]);
    });
  });

  it('affiche le Dashboard comme onglet actif sans curseur hérité de Cartographie', () => {
    cy.get('[data-testid="tab-dashboard"]').click().should('have.class', 'active');
    cy.get('.toolbar-switch').should('have.css', 'grid-template-columns', 'none');
    cy.get('.toolbar-switch').then($switch => {
      expect(getComputedStyle($switch[0], '::before').content).to.equal('none');
    });
    cy.get('[data-testid="tab-dashboard"]').then($button => {
      expect($button.css('background-color')).not.to.equal('rgba(0, 0, 0, 0)');
    });
  });

  it('préserve le menu Outils et les libellés complets sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]').should('be.visible');
    cy.get('.toolbar-switch > button').each($button => {
      expect($button[0].scrollWidth, $button.text()).to.be.at.most($button[0].clientWidth);
      expect($button.css('text-overflow')).not.to.equal('ellipsis');
    });
  });

  it('garde un onglet actif sans curseur violet débordant', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.toolbar-switch > button.active')
      .should('have.length', 1)
      .and('have.css', 'animation-name', 'none')
      .and('have.css', 'transform', 'none');
    cy.get('.toolbar-switch > button.active').then($button => {
      expect($button[0].getBoundingClientRect().width).to.be.lessThan(200);
    });
  });

  it('permet de revenir au dashboard avec le bouton Retour ou le bouton Précédent du navigateur', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('.tree-impact-toggle[aria-pressed="true"]').should('exist');
    cy.get('[data-testid="return-to-dashboard"]').should('be.visible');

    cy.go('back');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');

    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.get('[data-testid="return-to-dashboard"]').click();
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
  });

  it('reste lisible en thème sombre', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('.dashboard-panel').should('be.visible');
    cy.get('.dashboard-kpi').should('have.length', 5);
    cy.get('.app.theme-dark .dashboard-panel').should('have.css', 'background-color', 'rgb(23, 26, 32)');
  });

  it('garde des contours nets et un espacement régulier entre les domaines N0 de la heatmap', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-domain').first().should('be.visible').then($domain => {
      const style = getComputedStyle($domain[0]);
      expect(style.borderRadius).to.equal('0px');
      expect(style.overflow).to.equal('visible');
      expect(style.isolation).to.equal('auto');
      const title = $domain.find('.dashboard-map-domain-header strong')[0];
      const code = $domain.find('.dashboard-map-domain-code')[0];
      const titleStyle = getComputedStyle(title);
      const codeStyle = getComputedStyle(code);
      expect(titleStyle.fontSize).to.equal('12px');
      expect(titleStyle.fontWeight).to.equal('800');
      expect(titleStyle.letterSpacing).to.equal('normal');
      expect(title.parentElement.classList.contains('dashboard-map-domain-title')).to.equal(true);
      expect(title.nextElementSibling).to.equal(code);
      expect(codeStyle.fontSize).to.equal('10px');
      expect(codeStyle.fontWeight).to.equal('600');
    });
    cy.get('.dashboard-map-cell').first().should('have.css', 'padding', '10px').and('have.css', 'gap', '10px');
  });

});
