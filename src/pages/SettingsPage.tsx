import { useState, type FormEvent } from 'react';
import { Field, PageHeader } from '../components/ui';
import type { Settings, Signatory } from '../data/types';
import { useStore } from '../state/store';

type Errors = Partial<Record<'churchName' | 'compactName', string>>;

/** Dados institucionais usados nos documentos novos. Configuração secundária, salva neste navegador. */
export function SettingsPage() {
  const { data, saveSettings, notify } = useStore();
  const [draft, setDraft] = useState<Settings>(() => structuredClone(data.settings));
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const setPerson = (key: 'pastor' | 'secretary' | 'treasurer', field: keyof Signatory, value: string) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: value } }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const e: Errors = {};
    if (!draft.churchName.trim()) e.churchName = 'Informe o nome da igreja.';
    if (!draft.compactName.trim()) e.compactName = 'Informe o nome curto.';
    setErrors(e);
    if (Object.keys(e).length) return;
    saveSettings(draft);
    notify('Configurações salvas. Valem para os próximos documentos.');
  }

  const people: { key: 'pastor' | 'secretary' | 'treasurer'; label: string }[] = [
    { key: 'pastor', label: 'Pastor' },
    { key: 'secretary', label: 'Secretaria' },
    { key: 'treasurer', label: 'Tesouraria' },
  ];

  return (
    <>
      <PageHeader
        title="Configurações da igreja"
        description="Dados usados nos documentos novos. CNPJ e endereço estão como provisórios e precisam ser confirmados antes de qualquer uso real."
      />
      <form className="panel doc-form settings-form" onSubmit={handleSubmit} noValidate>
        <Field name="churchName" label="Nome da igreja" error={errors.churchName}>
          <input id="f-churchName" type="text" value={draft.churchName} onChange={(e) => set('churchName', e.target.value)} maxLength={140} />
        </Field>
        <Field name="compactName" label="Nome curto" error={errors.compactName}>
          <input id="f-compactName" type="text" value={draft.compactName} onChange={(e) => set('compactName', e.target.value)} maxLength={60} />
        </Field>
        <div className="field-pair">
          <Field name="cnpj" label="CNPJ">
            <input id="f-cnpj" type="text" value={draft.cnpj} onChange={(e) => set('cnpj', e.target.value)} maxLength={20} />
          </Field>
          <Field name="city" label="Local de emissão (cidade/UF)">
            <input id="f-city" type="text" value={draft.city} onChange={(e) => set('city', e.target.value)} maxLength={80} />
          </Field>
        </div>
        <Field name="address" label="Endereço">
          <input id="f-address" type="text" value={draft.address} onChange={(e) => set('address', e.target.value)} maxLength={160} />
        </Field>

        {people.map(({ key, label }) => (
          <div className="field-pair" key={key}>
            <Field name={`${key}-name`} label={`${label} (nome)`}>
              <input
                id={`f-${key}-name`}
                type="text"
                value={draft[key].name}
                onChange={(e) => setPerson(key, 'name', e.target.value)}
                maxLength={80}
              />
            </Field>
            <Field name={`${key}-role`} label="Cargo">
              <input
                id={`f-${key}-role`}
                type="text"
                value={draft[key].role}
                onChange={(e) => setPerson(key, 'role', e.target.value)}
                maxLength={60}
              />
            </Field>
          </div>
        ))}

        <p className="field-hint">
          Documentos já emitidos mantêm os dados da emissão. Os responsáveis desta demonstração são fictícios.
        </p>
        <div className="dialog-actions">
          <button type="submit" className="button button-primary">
            Salvar configurações
          </button>
        </div>
      </form>
    </>
  );
}
