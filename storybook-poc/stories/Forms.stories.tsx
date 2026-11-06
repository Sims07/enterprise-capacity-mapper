import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, SelectField, TextareaField, CheckboxField, SwitchField } from '../../src/components/ui/Fields.tsx';
import { withSignalTheme, storyGrid, storyPanel, storyHelp } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Formulaires',
  component: Field,
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
  args: { label: 'Nom de la capacité N1', placeholder: 'Ex. : Gestion des commandes' },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Texte: Story = {};
export const Recherche: Story = { args: { label: 'Rechercher un domaine', type: 'search', placeholder: 'Code, nom ou description' } };
export const Email: Story = { args: { label: 'Contact du responsable', type: 'email', placeholder: 'prenom@entreprise.fr' } };
export const AdresseWeb: Story = { args: { label: 'URL du référentiel', type: 'url', placeholder: 'https://…' } };
export const Nombre: Story = { args: { label: 'Maturité cible', type: 'number', min: 1, max: 5, defaultValue: 3 } };
export const Date: Story = { args: { label: 'Date de révision', type: 'date' } };
export const Couleur: Story = { args: { label: 'Couleur du domaine', type: 'color', defaultValue: '#425bc7' } };
export const Fichier: Story = { args: { label: 'Importer une cartographie JSON', type: 'file', accept: '.json,application/json' } };
export const Obligatoire: Story = { args: { label: 'Code N0', required: true, hint: 'Identifiant unique du domaine.' } };
export const Validation: Story = { args: { label: 'Nom de la capacité', required: true, error: 'Le nom de la capacité est obligatoire.', defaultValue: '' } };
export const Desactive: Story = { args: { label: 'Structure verrouillée', disabled: true, defaultValue: 'Mode présentation' } };
export const LectureSeule: Story = { args: { label: 'Identifiant technique', readOnly: true, defaultValue: 'CAP-OPS-001' } };

function DropdownDemo() {
  const [value, setValue] = useState('P2');
  return <div style={storyGrid}>
    <SelectField label="Priorité" value={value} onChange={event => setValue(event.target.value)}
      options={[{ value: 'P1', label: 'P1 — Critique' }, { value: 'P2', label: 'P2 — Élevée' }, { value: 'P3', label: 'P3 — Normale' }]} />
    <SelectField label="Domaine N0" defaultValue="crm" hint="Rattachement de la capacité."
      options={[{ value: 'crm', label: 'Relation client' }, { value: 'fin', label: 'Finance' }, { value: 'ops', label: 'Opérations' }]} />
    <SelectField label="Application indisponible" disabled defaultValue=""
      options={[{ value: '', label: 'Aucune application disponible' }]} />
    <SelectField label="Statut obligatoire" required error="Sélectionnez un statut." defaultValue=""
      options={[{ value: '', label: 'Choisir…' }, { value: 'active', label: 'Active' }]} />
  </div>;
}
export const Dropdowns: Story = { render: () => <DropdownDemo /> };

function LargeTextDemo() {
  const [text, setText] = useState('');
  return <div style={storyGrid}>
    <TextareaField label="Description de la capacité" rows={5} value={text}
      onChange={event => setText(event.target.value)} placeholder="Décrivez le savoir-faire métier, indépendamment de l'application…" />
    <TextareaField label="Justification métier" rows={5} required hint="Expliquez la maturité ou l'écart constaté." defaultValue="À valider avec le propriétaire métier." />
    <TextareaField label="Commentaire invalide" rows={3} error="Justification manquante." defaultValue="" />
  </div>;
}
export const ZonesDeTexte: Story = { render: () => <LargeTextDemo /> };

function OptionsDemo() {
  const [visible, setVisible] = useState(true);
  const [axes, setAxes] = useState(false);
  const [mode, setMode] = useState('detailed');
  return <div style={storyGrid}>
    <section style={storyPanel}>
      <h3>Cases à cocher</h3>
      <div style={{ display: 'grid', gap: 'var(--signal-space-3)' }}>
        <CheckboxField label="Afficher les titres des colonnes" checked={visible} onChange={event => setVisible(event.target.checked)} />
        <CheckboxField label="Afficher les titres des lignes" checked={axes} onChange={event => setAxes(event.target.checked)} />
        <CheckboxField label="Option non modifiable" disabled checked readOnly />
      </div>
    </section>
    <section style={storyPanel}>
      <h3>Boutons radio</h3>
      <fieldset style={{ display: 'grid', gap: 'var(--signal-space-3)', border: 0, padding: 0 }}>
        <legend style={storyHelp}>Niveau de cartographie</legend>
        <label className="ds-check"><input type="radio" name="detail" value="summary" checked={mode === 'summary'} onChange={event => setMode(event.target.value)} /> Vue synthétique N0</label>
        <label className="ds-check"><input type="radio" name="detail" value="detailed" checked={mode === 'detailed'} onChange={event => setMode(event.target.value)} /> Vue détaillée N0/N1</label>
      </fieldset>
    </section>
    <section style={storyPanel}>
      <h3>Interrupteurs</h3>
      <SwitchField label="Présentation" checked={visible} onChange={event => setVisible(event.target.checked)} />
      <p style={storyHelp}>État : {visible ? 'activé' : 'désactivé'}</p>
    </section>
  </div>;
}
export const ChoixEtInterrupteurs: Story = { render: () => <OptionsDemo /> };

function CompleteForm() {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('SaaS');
  const [notes, setNotes] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && !name.trim();
  return <form style={{ ...storyPanel, maxWidth: 600 }} onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
    <h3>Nouvelle application · exemple interactif</h3>
    <Field label="Nom" required value={name} onChange={event => setName(event.target.value)}
      placeholder="Ex. : Portail client" error={invalid ? 'Ce nom est obligatoire.' : undefined} />
    <SelectField label="Type" value={kind} onChange={event => setKind(event.target.value)}
      options={[{ value: 'SaaS', label: 'SaaS' }, { value: 'ERP', label: 'ERP' }, { value: 'On-Premise', label: 'On-Premise' }]} />
    <TextareaField label="Description" rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
    <CheckboxField label="Application active" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
    {submitted && name.trim() && <p className="ds-feedback" data-tone="success" role="status">Formulaire valide — aperçu uniquement, aucune donnée enregistrée.</p>}
    <div className="modal-actions"><button type="reset" onClick={() => { setName(''); setKind('SaaS'); setNotes(''); setEnabled(true); setSubmitted(false); }}>Réinitialiser</button><button type="submit" className="primary">Valider</button></div>
  </form>;
}
export const ParcoursDeFormulaire: Story = { render: () => <CompleteForm /> };
