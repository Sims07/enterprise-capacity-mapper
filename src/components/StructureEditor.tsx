import React from 'react';
import type { LayoutDraft } from '../application/layoutUseCases.ts';
import { Button } from './ui/Button.tsx';
import { Modal } from './ui/Modal.tsx';

type AxisKind = 'columns' | 'layers';
type HeadingPreference = 'showColumnHeadings' | 'showRowHeadings';

type StructureEditorProps = {
  draft: LayoutDraft;
  insertion: Record<AxisKind, string>;
  isAxisOccupied: (kind: AxisKind, id: string) => boolean;
  onHeadingChange: (preference: HeadingPreference, visible: boolean) => void;
  onAxisNameChange: (kind: AxisKind, id: string, name: string) => void;
  onZoneNameChange: (columnId: string, layerId: string, name: string) => void;
  onInsertionChange: (kind: AxisKind, value: string) => void;
  onAddAxis: (kind: AxisKind) => void;
  onRemoveAxis: (kind: AxisKind, id: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

const AXES = [
  { kind: 'columns', title: 'Colonnes', singular: 'Colonne', object: 'colonne' },
  { kind: 'layers', title: 'Lignes', singular: 'Ligne', object: 'ligne' },
] as const;

/** Presentation-only editor: grid transformations stay in the application layer. */
export function StructureEditor({
  draft, insertion, isAxisOccupied, onHeadingChange, onAxisNameChange,
  onZoneNameChange, onInsertionChange, onAddAxis, onRemoveAxis, onCancel, onSave,
}: StructureEditorProps) {
  return (
    <Modal title="Personnaliser la structure" className="structure-modal" onClose={onCancel}>
      <div className="structure-scroll" data-testid="structure-editor-content">
        <p className="structure-intro">Organisez les axes de votre cartographie et personnalisez leurs intitulés.</p>

        <section className="structure-section structure-options" data-testid="axis-heading-options" aria-labelledby="structure-options-title">
          <h3 id="structure-options-title">Afficher sur la carte</h3>
          <div className="structure-options-checks">
            <label className="structure-visibility-option">
              <input type="checkbox" checked={draft.showColumnHeadings !== false}
                onChange={event => onHeadingChange('showColumnHeadings', event.target.checked)} />
              Titres des colonnes
            </label>
            <label className="structure-visibility-option">
              <input type="checkbox" checked={draft.showRowHeadings !== false}
                onChange={event => onHeadingChange('showRowHeadings', event.target.checked)} />
              Titres des lignes
            </label>
          </div>
        </section>

        <div className="structure-axis-grid" data-testid="structure-axis-grid">
          {AXES.map(({ kind, title, singular, object }) => (
            <section className="structure-section structure-axis-panel" key={kind} data-testid={`structure-axis-${kind}`}>
              <div className="structure-panel-heading">
                <h3>{title}</h3>
                <span className="structure-axis-count">{draft[kind].length} {draft[kind].length === 1 ? object : `${object}s`}</span>
              </div>

              <div className="structure-axis-items">
                {draft[kind].map((item, index) => {
                  const occupied = isAxisOccupied(kind, item.id);
                  return (
                    <div className="structure-row" key={item.id}>
                      <label className="field">
                        <span>{singular} {index + 1}</span>
                        <input value={item.name} onChange={event => onAxisNameChange(kind, item.id, event.target.value)} />
                      </label>
                      <Button variant="quiet" className="structure-axis-delete"
                        aria-label={`Supprimer ${object} ${index + 1}`}
                        title={occupied ? 'Déplacez les N0 qui occupent cet axe avant de le supprimer' : 'Supprimer cet axe'}
                        disabled={draft[kind].length === 1 || occupied}
                        onClick={() => onRemoveAxis(kind, item.id)}>×</Button>
                    </div>
                  );
                })}
              </div>

              <div className="structure-insert-controls">
                <label className="field">
                  <span>Insérer une {object}</span>
                  <select data-testid={`structure-insert-${kind}`} value={insertion[kind]}
                    onChange={event => onInsertionChange(kind, event.target.value)}>
                    <option value="end">À la fin</option>
                    {draft[kind].map(item => <option key={item.id} value={item.id}>Avant « {item.name} »</option>)}
                  </select>
                </label>
                <Button variant="secondary" className="structure-axis-add" onClick={() => onAddAxis(kind)}>
                  Ajouter une {object}
                </Button>
              </div>
            </section>
          ))}
        </div>

        <details className="structure-zones" data-testid="structure-zones">
          <summary>
            <span className="structure-zones-summary">
              <strong>Zones de la matrice</strong>
              <small>Modifier les intitulés des intersections</small>
            </span>
            <span className="structure-zones-count">{draft.zones.length} zones</span>
          </summary>
          <div className="structure-zone-grid">
            {draft.zones.map(zone => {
              const column = draft.columns.find(item => item.id === zone.columnId);
              const layer = draft.layers.find(item => item.id === zone.layerId);
              return (
                <label className="field zone-row" key={`${zone.columnId}:${zone.layerId}`}
                  data-zone-key={`${zone.columnId}:${zone.layerId}`}>
                  <span>{column?.name} · {layer?.name}</span>
                  <input value={zone.name}
                    onChange={event => onZoneNameChange(zone.columnId, zone.layerId, event.target.value)} />
                </label>
              );
            })}
          </div>
        </details>
      </div>

      <div className="modal-actions structure-footer">
        <span className="structure-footer-hint">Modifications appliquées à l’enregistrement</span>
        <Button onClick={onCancel}>Annuler</Button>
        <Button variant="primary" onClick={onSave}>Enregistrer</Button>
      </div>
    </Modal>
  );
}
