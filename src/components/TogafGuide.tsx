import React from 'react';

export default function TogafGuide({onClose}) {
  return <div className="modal-backdrop">
    <div className="modal togaf-guide" role="dialog" aria-modal="true" aria-labelledby="togaf-guide-title">
      <div className="modal-head"><h2 id="togaf-guide-title">Comprendre une cartographie de capacités</h2><button aria-label="Fermer" onClick={onClose}>×</button></div>
      <div className="guide-intro"><b>Une capacité répond à la question :</b> « Qu’est-ce que l’entreprise doit savoir faire ? »<br/>Elle reste relativement stable dans le temps et ne dépend pas d’une application, d’une organisation ou d’un processus précis.</div>
      <section><h3>N0 — Domaine métier</h3><p>Le N0 est un <b>regroupement large</b> de capacités. Il sert à lire la carte rapidement.</p><p><b>Nom conseillé :</b> groupe nominal court. Exemples : <em>Relation client</em>, <em>Finance</em>, <em>Supply Chain</em>, <em>Ressources humaines</em>.</p></section>
      <section><h3>N1 — Capacité</h3><p>Le N1 précise <b>ce que l’entreprise sait faire</b>, sans décrire comment elle le fait.</p><p><b>Nom conseillé :</b> groupe nominal + objet métier. Exemples : <em>Gestion des commandes</em>, <em>Gestion des réclamations</em>, <em>Prévision de la demande</em>.</p><p className="do-dont"><span>✓ Préférer</span> « Gestion des commandes »<br/><span>× Éviter</span> « Gérer les commandes » (verbe d’action)<br/><span>× Éviter</span> « Équipe commandes » (organisation)<br/><span>× Éviter</span> « SAP » (application)</p></section>
      <section><h3>Comment savoir si c’est une capacité ?</h3><ul><li>Elle décrit un <b>quoi</b>, pas un « comment ».</li><li>Elle ne cite idéalement ni outil, ni équipe, ni processus particulier.</li><li>Elle peut être supportée par une ou plusieurs applications.</li><li>Elle reste valable même si l’organisation ou le SI change.</li></ul></section>
      <section><h3>Les niveaux ne sont pas des étapes de processus</h3><p>N0 → N1 signifie une <b>décomposition du périmètre</b>, pas « étape 0 puis étape 1 ». Une capacité N1 appartient à un domaine N0 et peut ensuite être reliée à plusieurs applications.</p></section>
      <div className="modal-actions"><button className="primary" onClick={onClose}>J’ai compris</button></div>
    </div>
  </div>;
}
