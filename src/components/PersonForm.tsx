import { useRef, useState, type FormEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { PERSON_CLASS_LABELS } from '../data/labels';
import type { Person, PersonClass } from '../data/types';
import { PhotoError, preparePhoto } from '../lib/image';
import { initials } from '../lib/text';
import { useStore } from '../state/store';
import { Field, Modal } from './ui';

const CLASSES: PersonClass[] = ['obreiro', 'membro', 'doador'];

/** Cadastro e edição de pessoa, com foto anexada pela secretaria. */
export function PersonFormDialog({
  open,
  person,
  onClose,
  onSaved,
}: {
  open: boolean;
  person?: Person;
  onClose: () => void;
  onSaved?: (person: Person) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="person-form-title" className="modal-form">
      {open && (
        <>
          <h2 id="person-form-title">{person ? 'Editar cadastro' : 'Cadastrar pessoa'}</h2>
          <PersonForm person={person} onCancel={onClose} onSaved={onSaved ?? (() => undefined)} onDone={onClose} />
        </>
      )}
    </Modal>
  );
}

interface Draft {
  name: string;
  classification: PersonClass;
  congregation: string;
  phone: string;
  photo?: string;
}

function PersonForm({
  person,
  onCancel,
  onSaved,
  onDone,
}: {
  person?: Person;
  onCancel: () => void;
  onSaved: (person: Person) => void;
  onDone: () => void;
}) {
  const { data, savePerson, notify } = useStore();
  const [draft, setDraft] = useState<Draft>(() => ({
    name: person?.name ?? '',
    classification: person?.classification ?? 'membro',
    congregation: person?.congregation ?? 'Sede',
    phone: person?.phone ?? '',
    photo: person?.photo,
  }));
  const [nameError, setNameError] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPhotoError(undefined);
    setProcessing(true);
    try {
      const photo = await preparePhoto(file);
      setDraft((d) => ({ ...d, photo }));
    } catch (error) {
      setPhotoError(error instanceof PhotoError ? error.message : 'Não foi possível usar esta foto.');
    } finally {
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving.current || processing) return;
    const name = draft.name.trim().replace(/\s+/g, ' ');
    if (!name) {
      setNameError('Informe o nome completo.');
      document.getElementById('f-name')?.focus();
      return;
    }
    saving.current = true;
    const saved = savePerson({
      id: person?.id,
      name,
      classification: draft.classification,
      congregation: draft.congregation,
      phone: draft.phone.trim() || undefined,
      photo: draft.photo,
    });
    notify(person ? 'Cadastro atualizado.' : `Cadastro salvo. Matrícula ${saved.registration}.`);
    onSaved(saved);
    onDone();
  }

  return (
    <form className="tx-form" onSubmit={handleSubmit} noValidate>
      <Field name="name" label="Nome completo" error={nameError} wide>
        <input
          id="f-name"
          name="name"
          type="text"
          value={draft.name}
          onChange={(e) => {
            setDraft((d) => ({ ...d, name: e.target.value }));
            setNameError(undefined);
          }}
          autoComplete="off"
          maxLength={100}
        />
      </Field>

      <Field name="classification" label="Classificação">
        <select
          id="f-classification"
          name="classification"
          value={draft.classification}
          onChange={(e) => setDraft((d) => ({ ...d, classification: e.target.value as PersonClass }))}
        >
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {PERSON_CLASS_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field name="congregation" label="Congregação">
        <select
          id="f-congregation"
          name="congregation"
          value={draft.congregation}
          onChange={(e) => setDraft((d) => ({ ...d, congregation: e.target.value }))}
        >
          {data.congregations.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field name="phone" label="Contato (opcional)" hint="Telefone ou e-mail. Não é obrigatório." wide>
        <input
          id="f-phone"
          name="phone"
          type="text"
          value={draft.phone}
          onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          autoComplete="off"
          maxLength={80}
        />
      </Field>

      <div className="field field-wide">
        <span className="field-label" id="photo-label">
          Foto (opcional)
        </span>
        <div className="photo-field">
          <div className="photo-preview">
            {draft.photo ? (
              <img src={draft.photo} alt="Prévia da foto anexada" />
            ) : (
              <span aria-hidden="true">{draft.name.trim() ? initials(draft.name) : '—'}</span>
            )}
          </div>
          <div className="photo-controls">
            <input
              ref={fileInput}
              id="f-photo"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="photo-buttons">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => fileInput.current?.click()}
                aria-describedby="photo-label photo-hint"
                disabled={processing}
              >
                <ImagePlus size={18} aria-hidden="true" />
                {draft.photo ? 'Trocar foto' : 'Anexar foto'}
              </button>
              {draft.photo && (
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setDraft((d) => ({ ...d, photo: undefined }));
                    setPhotoError(undefined);
                  }}
                >
                  Remover foto
                </button>
              )}
            </div>
            <p className="field-hint" id="photo-hint">
              JPG ou PNG, até 2 MB. Use apenas fotos de teste nesta demonstração.
            </p>
            {processing && <p className="field-hint">Preparando a foto…</p>}
            {photoError && (
              <p className="field-error" role="alert">
                {photoError}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="field-hint field-wide">
        {person ? `Matrícula ${person.registration}.` : 'A matrícula é gerada automaticamente ao salvar.'}
      </p>

      <div className="dialog-actions field-wide">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="button button-primary" disabled={processing}>
          Salvar cadastro
        </button>
      </div>
    </form>
  );
}
