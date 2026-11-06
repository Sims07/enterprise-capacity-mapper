import React, { useState } from 'react';
import { Button } from '../../src/components/ui/Button.tsx';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from '../../src/components/ui/Modal.tsx';
import { Field, SelectField } from '../../src/components/ui/Fields.tsx';
import { withSignalTheme, storyGrid, storyPanel, storyHelp } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Superpositions et messages',
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ConfirmationDemo() {
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState('');
  const close = () => setOpen(false);
  return <section style={storyPanel}>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Ouvrir la confirmation</Button>
    <p role="status" style={storyHelp}>{result}</p>
    {open && <Modal title="Ouvrir une cartographie" onClose={close}>
      <p>Ouvrir « Cartographie métier » remplacera la cartographie actuellement affichée.</p>
      <div className="modal-actions">
        <Button type="button" onClick={() => { setResult('Annulé'); close(); }}>Annuler</Button>
        <Button type="button" variant="primary" onClick={() => { setResult('Confirmation reçue'); close(); }}>Ouvrir la cartographie</Button>
      </div>
    </Modal>}
  </section>;
}
export const Confirmation: Story = { render: () => <ConfirmationDemo /> };

function FormDialogDemo() {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('SaaS');
  const [error, setError] = useState('');
  return <div style={storyPanel}>
    <Button type="button" onClick={() => setOpen(true)}>＋ Nouvelle application</Button>
    {open && <Modal title="Nouvelle application" onClose={() => setOpen(false)}>
      <Field label="Nom" required value={name} onChange={event => { setName(event.target.value); setError(''); }}
        error={error} placeholder="Portail client" />
      <SelectField label="Type" value={type} onChange={event => setType(event.target.value)}
        options={[{ value: 'SaaS', label: 'SaaS' }, { value: 'ERP', label: 'ERP' }, { value: 'On-Premise', label: 'On-Premise' }]} />
      <div className="modal-actions">
        <Button type="button" onClick={() => setOpen(false)}>Annuler</Button>
        <Button type="button" variant="primary" onClick={() => {
          if (!name.trim()) setError('Le nom est obligatoire.');
          else setOpen(false);
        }}>Enregistrer</Button>
      </div>
    </Modal>}
  </div>;
}
export const FormulaireDansUneModale: Story = { render: () => <FormDialogDemo /> };

export const Feedbacks: Story = {
  render: () => <div style={storyGrid}>
    {([
      { tone: 'neutral', text: 'Une cartographie peut être enregistrée localement.' },
      { tone: 'success', text: 'Structure enregistrée avec succès.' },
      { tone: 'warning', text: 'Trois capacités restent à qualifier.' },
      { tone: 'error', text: 'La sauvegarde a échoué. Réessayez.' },
    ] as const).map(item => <p key={item.tone} className="ds-feedback" data-tone={item.tone}
      role={item.tone === 'error' ? 'alert' : 'status'}>{item.text}</p>)}
  </div>,
};

function ToastDemo() {
  const [message, setMessage] = useState('Structure enregistrée');
  return <div style={storyPanel}>
    <h3>Notification non bloquante</h3>
    <p style={storyHelp}>Même classe de notification que l'éditeur. Le message reste neutre en cas de succès.</p>
    <Button type="button" onClick={() => setMessage('Cartographie sauvegardée en local')}>Déclencher une notification</Button>
    {message && <div className="toast" role="status" aria-live="polite">{message}</div>}
  </div>;
}
export const Toast: Story = { render: () => <ToastDemo /> };
