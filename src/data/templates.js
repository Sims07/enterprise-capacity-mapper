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
