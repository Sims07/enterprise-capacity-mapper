  assert.ok(brief.questions.some(question => /couvert|lacunes|incomplètes/i.test(question)));
});

test('produit une question de revue même lorsque la cartographie est cohérente', () => {
  const brief = buildDecisionBrief(analyzeCartography(model()));
  assert.equal(brief.hasFindings, false);
  assert.equal(brief.priorities.length, 0);
  assert.equal(brief.questions.length, 1);
});

test('rend le brief de décision visible dans le résumé de revue locale', () => {
  const result = analyzeCartography(model({ applications: [{ id: 'a1', name: 'ERP', capabilityIds: [] }] }));
  assert.match(result.summary, /À retenir\s*:/);
  assert.match(result.summary, /Questions de revue\s*:/);
});