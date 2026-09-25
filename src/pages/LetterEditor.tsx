import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LetterView } from '../components/LetterView';
import { ConfirmDialog, Field, PageHeader } from '../components/ui';
import type { LetterContent, LetterDeclaration, Signatory } from '../data/types';
import { isValidISODate, todayISO } from '../lib/dates';
import { DECLARATION_LABELS, DECLARATION_ORDER, suggestedLetterText } from '../lib/letter';
import { nextDocumentNumber, useStore } from '../state/store';

type Errors = Partial<Record<'personId' | 'destinationChurch' | 'destinationCity' | 'body' | 'place' | 'date', string>>;

export function LetterEditor() {
  const { data, issueDocument, notify } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const found = data.documents.find((d) => d.id === params.get('base'));
  const base = found?.type === 'carta_recomendacao' ? found : undefined;
  const people = useMemo(() => [...data.people].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [data.people]);

  const fromSheet = data.people.find((p) => p.id === params.get('pessoa'))?.id;
  const [personId, setPersonId] = useState(base?.content.personId ?? fromSheet ?? '');
  const [destinationChurch, setDestinationChurch] = useState(base?.content.destinationChurch ?? '');
  const [destinationCity, setDestinationCity] = useState(base?.content.destinationCity ?? '');
  const [declarations, setDeclarations] = useState<LetterDeclaration[]>(base?.content.declarations ?? []);
  const [customBody, setCustomBody] = useState<string | null>(base ? base.content.body : null);
  const [place, setPlace] = useState(base?.content.place ?? data.settings.city);
  const [date, setDate] = useState(todayISO());
  const [pastor, setPastor] = useState<Signatory>(base?.content.pastor ?? data.settings.pastor);
  const [secretary, setSecretary] = useState<Signatory>(base?.content.secretary ?? data.settings.secretary);
  const [errors, setErrors] = useState<Errors>({});
  const [confirming, setConfirming] = useState(false);
  const issuing = useRef(false);

  // Nova versão: os dados da pessoa vêm da cópia emitida, a menos que outra pessoa seja escolhida.
  const person = data.people.find((p) => p.id === personId);
  const personData = person
    ? {
        personName: person.name,
        personRegistration: person.registration,
        personClassification: person.classification,
        personCongregation: person.congregation,
      }
    : base && base.content.personId === personId
      ? {
          personName: base.content.personName,
          personRegistration: base.content.personRegistration,
          personClassification: base.content.personClassification,
          personCongregation: base.content.personCongregation,
        }
      : { personName: '', personRegistration: '', personClassification: 'membro' as const, personCongregation: '' };

  const suggested = suggestedLetterText({ ...personData, destinationChurch, destinationCity, declarations });
  const body = customBody ?? suggested;

  const content: LetterContent = {
    churchName: data.settings.churchName,
    cnpj: data.settings.cnpj,
    address: data.settings.address,
    personId,
    ...personData,
    destinationChurch: destinationChurch.trim(),
    destinationCity: destinationCity.trim(),
    declarations,
    body,
    place: place.trim(),
    date,
    pastor,
    secretary,
  };

  const sameNumber = base ? data.documents.filter((d) => d.number === base.number) : [];
  const nextLabel = base
    ? `${base.number} (versão ${Math.max(...sameNumber.map((d) => d.version)) + 1})`
    : `${nextDocumentNumber(data.documents)} (versão 1)`;

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggle(declaration: LetterDeclaration) {
    setDeclarations((current) =>
      current.includes(declaration) ? current.filter((d) => d !== declaration) : [...current, declaration],
    );
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!personId || !personData.personName) e.personId = 'Escolha a pessoa cadastrada.';
    if (!destinationChurch.trim()) e.destinationChurch = 'Informe a igreja de destino.';
    if (!destinationCity.trim()) e.destinationCity = 'Informe a cidade e o estado de destino.';
    if (!body.trim()) e.body = 'O texto da carta não pode ficar vazio.';
    if (!place.trim()) e.place = 'Informe o local de emissão.';
    if (!isValidISODate(date)) e.date = 'Informe uma data válida.';
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setConfirming(true);
  }

  function emit() {
    if (issuing.current) return;
    issuing.current = true;
    setConfirming(false);
    const doc = issueDocument({ type: 'carta_recomendacao', content }, 'Sede', base);
    notify(`Carta emitida: ${doc.number}, versão ${doc.version}.`);
    navigate(`/documentos/${doc.id}`, { replace: true });
  }

  return (
    <>
      <Link to={base ? `/documentos/${base.id}` : '/documentos'} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        {base ? `${base.number} · versão ${base.version}` : 'Documentos'}
      </Link>
      <PageHeader
        title={base ? 'Nova versão da carta de recomendação' : 'Carta de recomendação'}
        description="Preencha, revise o texto na prévia e confirme a emissão. Depois de emitida, a carta pode ser assinada e impressa."
      />
      {base && (
        <p className="notice">
          Esta será uma nova versão de {base.number}. A versão {base.version} continua no histórico, e as assinaturas dela não
          passam para a nova versão.
        </p>
      )}

      <div className="doc-editor">
        <form className="panel doc-form" onSubmit={handleSubmit} noValidate>
          <Field name="personId" label="Pessoa" error={errors.personId}>
            <select id="f-personId" name="personId" value={personId} onChange={(e) => {
                setPersonId(e.target.value);
                clearError('personId');
              }}>
              <option value="">Escolha a pessoa</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.registration}
                </option>
              ))}
            </select>
          </Field>
          <Field name="destinationChurch" label="Igreja de destino" error={errors.destinationChurch}>
            <input
              id="f-destinationChurch"
              type="text"
              value={destinationChurch}
              onChange={(e) => {
                setDestinationChurch(e.target.value);
                clearError('destinationChurch');
              }}
              placeholder="Ex.: Igreja Evangélica Assembleia de Deus"
              maxLength={120}
            />
          </Field>
          <Field name="destinationCity" label="Cidade/UF de destino" error={errors.destinationCity}>
            <input
              id="f-destinationCity"
              type="text"
              value={destinationCity}
              onChange={(e) => {
                setDestinationCity(e.target.value);
                clearError('destinationCity');
              }}
              placeholder="Ex.: Cidade/UF"
              maxLength={80}
            />
          </Field>

          <fieldset className="declarations">
            <legend>Declarações</legend>
            <p className="field-hint">
              Marque somente o que a secretaria confirmou. Nada aqui é preenchido a partir do financeiro.
            </p>
            {DECLARATION_ORDER.map((d) => (
              <label key={d} className="check-row">
                <input type="checkbox" checked={declarations.includes(d)} onChange={() => toggle(d)} />
                {DECLARATION_LABELS[d]}
              </label>
            ))}
          </fieldset>

          <Field
            name="body"
            label="Texto da carta"
            error={errors.body}
            hint={customBody === null ? 'O texto acompanha os campos acima. Você pode editá-lo livremente.' : 'Texto editado manualmente.'}
          >
            <textarea
              id="f-body"
              rows={9}
              value={body}
              onChange={(e) => {
                setCustomBody(e.target.value);
                clearError('body');
              }}
            />
          </Field>
          {customBody !== null && (
            <button type="button" className="button button-ghost self-start" onClick={() => setCustomBody(null)}>
              Voltar ao texto sugerido
            </button>
          )}

          <div className="field-pair">
            <Field name="place" label="Local" error={errors.place}>
              <input id="f-place" type="text" value={place} onChange={(e) => {
                  setPlace(e.target.value);
                  clearError('place');
                }} maxLength={80} />
            </Field>
            <Field name="date" label="Data" error={errors.date}>
              <input id="f-date" type="date" value={date} onChange={(e) => {
                  setDate(e.target.value);
                  clearError('date');
                }} />
            </Field>
          </div>

          <div className="field-pair">
            <Field name="pastorName" label="Pastor (nome)">
              <input
                id="f-pastorName"
                type="text"
                value={pastor.name}
                onChange={(e) => setPastor({ ...pastor, name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field name="pastorRole" label="Cargo">
              <input
                id="f-pastorRole"
                type="text"
                value={pastor.role}
                onChange={(e) => setPastor({ ...pastor, role: e.target.value })}
                maxLength={60}
              />
            </Field>
          </div>
          <div className="field-pair">
            <Field name="secretaryName" label="Secretaria (nome)">
              <input
                id="f-secretaryName"
                type="text"
                value={secretary.name}
                onChange={(e) => setSecretary({ ...secretary, name: e.target.value })}
                maxLength={80}
              />
            </Field>
            <Field name="secretaryRole" label="Cargo">
              <input
                id="f-secretaryRole"
                type="text"
                value={secretary.role}
                onChange={(e) => setSecretary({ ...secretary, role: e.target.value })}
                maxLength={60}
              />
            </Field>
          </div>

          <div className="dialog-actions">
            <Link to={base ? `/documentos/${base.id}` : '/documentos'} className="button button-secondary">
              Cancelar
            </Link>
            <button type="submit" className="button button-primary">
              Revisar e emitir
            </button>
          </div>
        </form>

        <div className="doc-preview" aria-label="Prévia">
          <p className="doc-preview-label">Prévia</p>
          <LetterView content={content} />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Emitir carta de recomendação?"
        message={`A carta para ${personData.personName} será registrada no histórico como ${nextLabel}, com uma cópia deste texto. Depois de emitida, mudanças exigem uma nova versão e novas assinaturas.`}
        confirmLabel="Emitir carta"
        onCancel={() => setConfirming(false)}
        onConfirm={emit}
      />
    </>
  );
}
