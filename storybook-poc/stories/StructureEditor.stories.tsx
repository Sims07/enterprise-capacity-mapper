import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StructureEditor } from '../../src/components/StructureEditor.tsx';
import { Button } from '../../src/components/ui/Button.tsx';
import {
  completeLayoutZones,
  addLayoutDraftItem, insertLayoutDraftItem, removeLayoutDraftItem,
  renameLayoutDraftItem, renameLayoutZone,
  type LayoutDraft,
} from '../../src/application/layoutUseCases.ts';
import { withSignalTheme, storyPanel, storyHelp } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Éditeur de structure',
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const initial: LayoutDraft = {
  columns: [
    { id: 'patient', name: 'Usager / Patient' },
    { id: 'p5ue', name: 'P5 UE' },
    { id: 'p5', name: 'P5' },
  ],
  layers: [
    { id: 'strategy', name: 'Exposition' },
    { id: 'core', name: 'Cœur métier' },
    { id: 'support', name: 'Support métier' },
  ],
  zones: [],
};
initial.zones = completeLayoutZones(initial.columns, initial.layers, []);

function EditorPreview() {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<LayoutDraft>(initial);
  const [insertion, setInsertion] = useState({ columns: 'end', layers: 'end' });
  const sequence = useRef(0);

  return <section style={{ ...storyPanel, maxWidth: 640 }}>
    <h3>Personnaliser la structure</h3>
    <p style={storyHelp}>Aperçu interactif des axes, de la visibilité et des zones, en thème clair et sombre.</p>
    <Button onClick={() => setOpen(true)}>Ouvrir l’éditeur</Button>
    {open && <StructureEditor
      draft={draft}
      insertion={insertion}
      isAxisOccupied={(_, id) => id === 'patient'}
      onHeadingChange={(key, value) => setDraft(previous => ({ ...previous, [key]: value }))}
      onAxisNameChange={(kind, id, value) => setDraft(previous => renameLayoutDraftItem(previous, kind, id, value))}
      onZoneNameChange={(columnId, layerId, name) => setDraft(previous => renameLayoutZone(previous, columnId, layerId, name))}
      onInsertionChange={(kind, value) => setInsertion(previous => ({ ...previous, [kind]: value }))}
      onAddAxis={kind => {
        const id = `storybook-${kind}-${++sequence.current}`;
        setDraft(previous => {
          const next = insertion[kind] === 'end'
            ? addLayoutDraftItem(previous, kind, id)
            : insertLayoutDraftItem(previous, kind, id, insertion[kind]);
          return renameLayoutDraftItem(next, kind, id, `${kind === 'columns' ? 'Colonne' : 'Ligne'} ${next[kind].length}`);
        });
      }}
      onRemoveAxis={(kind, id) => setDraft(previous => removeLayoutDraftItem(previous, kind, id))}
      onCancel={() => setOpen(false)}
      onSave={() => setOpen(false)}
    />}
  </section>;
}

export const EditionCompacte: Story = { render: () => <EditorPreview /> };
