import React, { useEffect, useState } from 'react';

export const newId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const cloneItems = items => items.map(x => ({ id: x.id, name: x.name }));

export const TEMPLATES = [
  {
    id: 'matrix',
    label: 'Matrice Client – Produit – Opérations – Support',
    description: 'La structure de démonstration : 4 colonnes métier croisées avec 3 niveaux (stratégique, cœur, support).',
    columns: [
      { id: 'customer', name: 'Client' },
      { id: 'product', name: 'Produit' },
      { id: 'operations', name: 'Opérations' },
      { id: 'support', name: 'Support' }
    ],
    layers: [
      { id: 'strategic', name: 'Stratégique' },
      { id: 'core', name: 'Core / Value' },
      { id: 'support', name: 'Support' }
    ]
  },
  {
    id: 'capability',
    label: 'Capability map classique',
    description: 'Une seule ligne avec trois familles de capacités : pilotage, cœur de métier et support.',
    columns: [
      { id: 'steering', name: 'Pilotage' },
      { id: 'core', name: 'Cœur de métier' },
      { id: 'support', name: 'Support' }
    ],
    layers: [{ id: 'default', name: 'Principal' }]
  },
  {
    id: 'value-chain',
    label: 'Chaîne de valeur',
    description: 'Les colonnes suivent les étapes de la chaîne de valeur, les lignes séparent management, cœur et support.',
    columns: [
      { id: 'design', name: 'Concevoir' },
      { id: 'sell', name: 'Vendre' },
      { id: 'produce', name: 'Produire' },
      { id: 'deliver', name: 'Livrer' },
      { id: 'serve', name: 'Servir' }
    ],
    layers: [
      { id: 'management', name: 'Management' },
      { id: 'core', name: 'Cœur de métier' },
      { id: 'support', name: 'Support' }
    ]
  },
  {
    id: 'blank',
    label: 'Vierge',
    description: 'Une seule colonne et une seule ligne, à structurer vous-même à l’étape suivante.',
    columns: [{ id: 'default', name: 'Général' }],
    layers: [{ id: 'default', name: 'Principal' }]
  }
];

export function fromLayout(layout) {
  const columns = layout?.columns?.length ? layout.columns : [{ id: 'default', name: 'Général' }];
  const layers = layout?.layers?.length ? layout.layers : [{ id: 'default', name: 'Principal' }];
  return {
    id: 'current',
    label: 'Reprendre la structure actuelle',
    description: 'Conserve colonnes, lignes et noms de zones. Domaines, capacités et applications sont vidés.',
    columns: cloneItems(columns),
    layers: cloneItems(layers),
    zones: (layout?.zones || []).map(z => ({ ...z }))
  };
}


const STEPS = ['Point de départ', 'Structure', 'Récapitulatif'];
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

function AxisEditor({ kind, title, addLabel, items, onRename, onMove, onRemove, onAdd }) {
  const single = title.slice(0, -1);
  return (
    <section className="axis-editor" data-testid={`axis-${kind}`}>
      <h3>{title}</h3>
      {items.map((item, i) => (
        <div className="axis-row" key={item.id}>
          <input
            aria-label={`${single} ${i + 1}`}
            data-testid={`structure-${kind}-input`}
            value={item.name}
            onChange={e => onRename(item.id, e.target.value)}
          />
          <button type="button" className="icon-btn" aria-label={`Monter ${item.name}`} disabled={i === 0} onClick={() => onMove(item.id, -1)}>↑</button>
          <button type="button" className="icon-btn" aria-label={`Descendre ${item.name}`} disabled={i === items.length - 1} onClick={() => onMove(item.id, 1)}>↓</button>
          <button type="button" className="icon-btn danger" aria-label={`Supprimer ${item.name}`} disabled={items.length === 1} onClick={() => onRemove(item.id)}>×</button>
        </div>
      ))}
      <button type="button" className="structure-add" data-testid={`structure-add-${kind}`} onClick={onAdd}>{addLabel}</button>
    </section>
  );
}

function Preview({ columns, layers }) {
  return (
    <div className="preview" data-testid="wizard-preview" aria-label="Aperçu de la grille">
      <div className="preview-grid" style={{ gridTemplateColumns: `90px repeat(${columns.length}, minmax(60px, 1fr))` }}>
        <div />
        {columns.map(c => <div className="pv-head" key={c.id}>{c.name || '…'}</div>)}
        {layers.map(l => (
          <React.Fragment key={l.id}>
            <div className="pv-axis">{l.name || '…'}</div>
            {columns.map(c => <div className="pv-cell" key={c.id} />)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function NewMapWizard({ model, onCancel, onCreate }) {
  const initial = TEMPLATES[0];
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(initial.id);
  const [name, setName] = useState('Nouvelle cartographie');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState(() => cloneItems(initial.columns));
  const [layers, setLayers] = useState(() => cloneItems(initial.layers));
  const [zones, setZones] = useState([]);
  const [backup, setBackup] = useState(true);
  const [error, setError] = useState('');

  const options = [...TEMPLATES, fromLayout(model.layout)];
  const counts = {
    domains: model.domains?.length || 0,
    capabilities: model.capabilities?.length || 0,
    applications: model.applications?.length || 0
  };
  const hasContent = counts.domains + counts.capabilities + counts.applications > 0;

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const chooseTemplate = t => {
    setTemplateId(t.id);
    setColumns(cloneItems(t.columns));
    setLayers(cloneItems(t.layers));
    setZones(t.zones || []);
    setError('');
  };

  const setters = { columns: setColumns, layers: setLayers };
  const rename = (kind, id, value) => setters[kind](items => items.map(x => (x.id === id ? { ...x, name: value } : x)));
  const add = kind => setters[kind](items => [...items, { id: newId(kind === 'columns' ? 'column' : 'layer'), name: kind === 'columns' ? 'Nouvelle colonne' : 'Nouvelle ligne' }]);
  const remove = (kind, id) => setters[kind](items => (items.length <= 1 ? items : items.filter(x => x.id !== id)));
  const move = (kind, id, dir) => setters[kind](items => {
    const i = items.findIndex(x => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= items.length) return items;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  const next = () => {
    if (step === 0 && !name.trim()) { setError('Le nom de la cartographie est obligatoire.'); return; }
    if (step === 1 && [...columns, ...layers].some(x => !x.name.trim())) { setError('Chaque colonne et chaque ligne doit avoir un nom.'); return; }
    setError('');
    setStep(s => s + 1);
  };
  const previous = () => { setError(''); setStep(s => Math.max(0, s - 1)); };

  const buildLayout = () => {
    const cols = columns.map((x, i) => ({ id: x.id, name: x.name.trim(), order: i }));
    const lys = layers.map((x, i) => ({ id: x.id, name: x.name.trim(), order: i }));
    const colIds = new Set(cols.map(x => x.id));
    const layIds = new Set(lys.map(x => x.id));
    return {
      mode: 'matrix',
      columns: cols,
      layers: lys,
      zones: zones.filter(z => colIds.has(z.columnId) && layIds.has(z.layerId))
    };
  };

  const create = () => onCreate({
    name: name.trim(),
    description: description.trim(),
    layout: buildLayout(),
    backup: hasContent && backup
  });

  return (
    <div className="modal-backdrop">
      <div className="modal wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <div className="modal-head">
          <h2 id="wizard-title">Nouvelle cartographie</h2>
          <button type="button" aria-label="Fermer l’assistant" onClick={onCancel}>×</button>
        </div>

        <ol className="wizard-steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <b>{i + 1}</b>{label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div data-testid="wizard-step-1">
            <label className="field">
              <span>Nom de la cartographie</span>
              <input data-testid="wizard-name" autoFocus value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Description (facultative)</span>
              <input data-testid="wizard-description" value={description} onChange={e => setDescription(e.target.value)} />
            </label>
            <div className="wizard-label">Choisissez une structure de départ</div>
            <div className="template-grid">
              {options.map(t => (
                <button
                  type="button"
                  key={t.id}
                  className="template-card"
                  data-testid={`template-${t.id}`}
                  aria-pressed={templateId === t.id}
                  onClick={() => chooseTemplate(t)}
                >
                  <b>{t.label}</b>
                  <p>{t.description}</p>
                  <small>{plural(t.columns.length, 'colonne', 'colonnes')} × {plural(t.layers.length, 'ligne', 'lignes')}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div data-testid="wizard-step-2">
            <p className="structure-hint">Les colonnes se lisent de gauche à droite, les lignes de haut en bas. Vous pourrez encore modifier la structure plus tard avec le bouton « Structure ».</p>
            <div className="wizard-structure">
              <AxisEditor kind="columns" title="Colonnes" addLabel="＋ Ajouter une colonne" items={columns} onRename={(id, v) => rename('columns', id, v)} onMove={(id, d) => move('columns', id, d)} onRemove={id => remove('columns', id)} onAdd={() => add('columns')} />
              <AxisEditor kind="layers" title="Lignes" addLabel="＋ Ajouter une ligne" items={layers} onRename={(id, v) => rename('layers', id, v)} onMove={(id, d) => move('layers', id, d)} onRemove={id => remove('layers', id)} onAdd={() => add('layers')} />
            </div>
            <Preview columns={columns} layers={layers} />
          </div>
        )}

        {step === 2 && (
          <div data-testid="wizard-step-3">
            <dl className="recap">
              <dt>Nom</dt><dd>{name.trim()}</dd>
              {description.trim() && <><dt>Description</dt><dd>{description.trim()}</dd></>}
              <dt>Colonnes</dt><dd>{columns.map(c => c.name.trim()).join(' · ')}</dd>
              <dt>Lignes</dt><dd>{layers.map(l => l.name.trim()).join(' · ')}</dd>
            </dl>
            <Preview columns={columns} layers={layers} />
            {hasContent ? (
              <>
                <div className="warn-box" data-testid="wizard-warning">
                  <b>La cartographie actuelle sera remplacée.</b> Seront supprimés : {plural(counts.domains, 'domaine N0', 'domaines N0')}, {plural(counts.capabilities, 'capacité N1', 'capacités N1')} et {plural(counts.applications, 'application', 'applications')}.
                </div>
                <label className="check">
                  <input type="checkbox" data-testid="wizard-backup" checked={backup} onChange={e => setBackup(e.target.checked)} />
                  Télécharger une sauvegarde JSON de la cartographie actuelle avant de la remplacer
                </label>
              </>
            ) : (
              <p className="structure-hint">La cartographie actuelle est vide : rien ne sera perdu.</p>
            )}
          </div>
        )}

        {error && <p className="wizard-error" role="alert" data-testid="wizard-error">{error}</p>}

        <div className="modal-actions wizard-footer">
          <button type="button" onClick={onCancel}>Annuler</button>
          <span className="spacer" />
          {step > 0 && <button type="button" onClick={previous}>Précédent</button>}
          {step < 2
            ? <button type="button" className="primary" onClick={next}>Suivant</button>
            : <button type="button" className="primary" data-testid="wizard-create" onClick={create}>Créer la cartographie</button>}
        </div>
      </div>
    </div>
  );
}
