describe('Dashboard de couverture', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('garde les cartes du dashboard dans leurs limites sans chevauchement en vue dépliée', () => {
    cy.viewport(1280, 900);
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('be.visible');
    cy.get('.dashboard-intent-nav > button').should('have.length', 4).then($cards => {
      const rects = [...$cards].map(card => card.getBoundingClientRect());
      for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
        const overlaps = rects[i].left < rects[j].right && rects[i].right > rects[j].left && rects[i].top < rects[j].bottom && rects[i].bottom > rects[j].top;
        expect(overlaps, 'les cartes ne se chevauchent pas').to.equal(false);
      }
    });
    cy.get('.dashboard-overview-intro').should('be.visible').then($intro => {
      const intro = $intro[0].getBoundingClientRect();
      const shortcuts = $intro.find('.dashboard-overview-shortcuts')[0].getBoundingClientRect();
      expect(shortcuts.left).to.be.at.least(intro.left);
      expect(shortcuts.right).to.be.at.most(intro.right);
      expect(shortcuts.top).to.be.at.least(intro.top);
      expect(shortcuts.bottom).to.be.at.most(intro.bottom);
    });
  });

  it('présente des indicateurs calculés depuis la cartographie active', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="analysis-view-switch"] [data-testid="tab-dashboard"]').should('exist');
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

  it('focalise les composants selon l’intention choisie', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('have.class', 'is-active');
    cy.get('.dashboard-kpis').should('be.visible');
    cy.get('[data-testid="dashboard-overview-intro"]').should('be.visible');

    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-kpis').should('not.be.visible');
    cy.get('[data-testid="dashboard-coverage-heatmap"]').should('be.visible');
    cy.get('.dashboard-footnote').should('not.be.visible');

    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('.dashboard-kpis').should('not.be.visible');

    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('.dashboard-kpis').should('not.be.visible');
    cy.get('[data-testid="dashboard-gap-priorities"]').should('be.visible');
  });

  it('priorise les domaines avec gaps et classe la couverture du plus faible au plus fort', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();

    cy.get('.dashboard-domain-row .dashboard-domain-progress[role="progressbar"]').then($bars => {
      const coverageValues = [...$bars].map(bar => Number(bar.getAttribute('aria-valuenow')));
      expect(coverageValues).to.deep.equal([...coverageValues].sort((a, b) => a - b));
    });

    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('[data-testid="dashboard-gap-count"]').invoke('text').then(value => {
      const gapCount = Number(value.trim());
      if (gapCount > 0) {
        cy.get('[data-testid="dashboard-no-gaps"]').should('not.exist');
        cy.get('.dashboard-gap-domain').should('have.length.greaterThan', 0).each($domain => {
          cy.wrap($domain).find('.dashboard-gap-domain-heading b').invoke('text').then(count => {
            expect(Number(count.trim())).to.be.greaterThan(0);
          });
        });
      } else {
        cy.get('[data-testid="dashboard-no-gaps"]').should('be.visible');
        cy.get('.dashboard-gap-domain').should('not.exist');
      }
    });
  });

  it('affiche la heatmap dans la même matrice de positionnement que la cartographie', () => {
    cy.get('[data-testid="nav-analysis"]').click();
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
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-domain[data-domain-id="l0-1"]')
      .closest('.dashboard-map-cell').should('have.attr', 'data-column', 'customer').and('have.attr', 'data-layer', 'core').and('have.attr', 'style').and('contain', 'grid-column: span 2');
    cy.get('.dashboard-map-row[data-layer="core"] .dashboard-map-cell[data-column="product"]').should('not.exist');
    cy.get('.dashboard-map-column-headings span').should('have.length', 4);
  });

  it('identifie une application sans relation et permet de la relier depuis le dashboard', () => {
    cy.get('.side-add').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('label.field', /^Nom/).find('input').type('Application orpheline test');
      cy.contains('label.field', /^Code/).find('input').type('APP-ORPHELINE');
      cy.contains('label.field', /Éditeur \/ fournisseur/).find('input').type('Éditeur test');
      cy.contains('button', 'Créer').click();
    });
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]').within(() => {
      cy.contains('Application orpheline test').should('be.visible');
      cy.get('button[aria-label="Relier Application orpheline test à des capacités N1"]').click();
    });
    cy.get('[role="dialog"]').should('contain.text', 'Relier « Application orpheline test »');
    cy.get('[data-testid="link-list"] input[type="checkbox"]').first().check();
    cy.get('[data-testid="link-save"]').click();
    cy.get('[data-testid="dashboard-unlinked-apps"]').should('contain.text', 'Toutes les applications sont reliées').and('not.contain.text', 'Application orpheline test');
  });

  it('garde la navigation principale sur une seule ligne sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('.toolbar-switch > button').should('have.length', 3).then($tabs => {
      const tops = [...$tabs].map(tab => tab.getBoundingClientRect().top);
      expect(Math.max(...tops) - Math.min(...tops)).to.be.lessThan(1);
    });
  });

  it('garde un seul onglet actif sans curseur hérité, sur desktop et mobile', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    const tabs = ['[data-testid="tab-relations"]', '[data-testid="tab-dashboard"]'];
    tabs.forEach(selector => {
      cy.get(selector).click().should('have.class', 'active');
      cy.get('.analysis-view-switch > button.active').should('have.length', 1)
        .and('have.attr', 'data-testid').and('equal', selector.match(/tab-[a-z]+/)[0]);
    });
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('.analysis-view-switch').should('be.visible');
    cy.get('.analysis-view-switch').then($switch => expect(getComputedStyle($switch[0], '::before').content).to.equal('none'));
    cy.get('[data-testid="tab-dashboard"]').then($button => expect($button.css('background-color')).not.to.equal('rgba(0, 0, 0, 0)'));

    cy.viewport(390, 844);
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.analysis-view-switch > button.active').should('have.length', 1).and('have.css', 'animation-name', 'none').and('have.css', 'transform', 'none');
    cy.get('.analysis-view-switch > button.active').then($button => expect($button[0].getBoundingClientRect().width).to.be.lessThan(200));
  });

  it('préserve le menu Outils et les libellés complets sur mobile', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]').should('be.visible');
    cy.get('.toolbar-switch > button').each($button => {
      expect($button[0].scrollWidth, $button.text()).to.be.at.most($button[0].clientWidth);
      expect($button.css('text-overflow')).not.to.equal('ellipsis');
    });
  });


  it('permet de revenir au dashboard avec le bouton Retour ou le bouton Précédent du navigateur', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('.tree-impact-toggle[aria-pressed="true"]').should('exist');
    cy.go('back');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.go('back');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
  });

  it('reste lisible en thème sombre', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('.dashboard-panel').should('be.visible');
    cy.get('.dashboard-kpi').should('have.length', 5);
    cy.get('.app.theme-dark .dashboard-panel').should('have.css', 'background-color', 'rgb(23, 26, 32)');
  });

  it('garde des contours nets et un espacement régulier entre les domaines N0 de la heatmap', () => {
    cy.get('[data-testid="nav-analysis"]').click();
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

  it('enregistre les quatre sous-vues Analyse dans l’historique navigateur', () => {
    cy.visit('/');
    cy.window().then(win => win.history.replaceState({ capacityMapperMode: 'editor' }, '', win.location.href));
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('have.class', 'is-active');

    cy.get('main').scrollTo('bottom');
    cy.get('main').invoke('prop', 'scrollTop').should('be.greaterThan', 0);
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').should('have.class', 'is-active');
    cy.get('main').invoke('prop', 'scrollTop').should('equal', 0);

    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').should('have.class', 'is-active');
    cy.get('main').scrollTo('bottom');
    cy.go('back');
    cy.get('[data-testid="dashboard-view-coverage"]').should('have.class', 'is-active');
    cy.get('main').invoke('prop', 'scrollTop').should('equal', 0);

    cy.go('back');
    cy.get('[data-testid="dashboard-view-overview"]').should('have.class', 'is-active');
    cy.go('forward');
    cy.get('[data-testid="dashboard-view-coverage"]').should('have.class', 'is-active');
    cy.go('forward');
    cy.get('[data-testid="dashboard-view-impact"]').should('have.class', 'is-active');

    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('[data-testid="dashboard-view-attention"]').should('have.class', 'is-active');
    cy.go('back');
    cy.get('[data-testid="dashboard-view-impact"]').should('have.class', 'is-active');
  });


  it('utilise les tokens sémantiques pour le dashboard et ses états métier en thème sombre', () => {
    cy.window().then(win => {
      win.localStorage.setItem('enterprise-capacity-mapper:theme', 'dark');
    });
    cy.reload();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('.dashboard').should('be.visible');
    cy.get('.dashboard-kpi').first().should('be.visible').then($card => {
      const styles = getComputedStyle($card[0]);
      expect(styles.backgroundColor, 'surface du KPI calculée').not.to.equal('');
      expect(styles.borderColor, 'bordure du KPI calculée').not.to.equal('');
    });
    cy.get('[data-testid="dashboard-view-attention"]').click();
    cy.get('.dashboard-status').first().should('be.visible').then($status => {
      const styles = getComputedStyle($status[0]);
      expect(styles.color, 'texte de statut calculé').not.to.equal('');
      expect(styles.backgroundColor, 'fond de statut calculé').not.to.equal('');
    });
    cy.document().then(doc => {
      const root = getComputedStyle(doc.querySelector('.app'));
      ['--status-gap-text', '--status-gap-bg', '--status-redundant-text', '--status-covered-text'].forEach(token => {
        expect(root.getPropertyValue(token).trim(), token).not.to.equal('');
      });
    });
  });

});

export {};
