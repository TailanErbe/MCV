import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, IdCard as IdCardIcon, Pencil } from 'lucide-react';
import { PersonFormDialog } from '../components/PersonForm';
import { PageHeader } from '../components/ui';
import { PERSON_CLASS_LABELS } from '../data/labels';
import { initials } from '../lib/text';
import { useStore } from '../state/store';

export function PersonDetail() {
  const { id } = useParams();
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const person = data.people.find((p) => p.id === id);

  if (!person) return <PersonNotFound />;

  return (
    <>
      <Link to="/pessoas" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Pessoas
      </Link>
      <PageHeader
        title={person.name}
        description={`${PERSON_CLASS_LABELS[person.classification]} · ${person.congregation}`}
        actions={
          <div className="register-buttons">
            <button type="button" className="button button-secondary" onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden="true" />
              Editar cadastro
            </button>
            <Link to={`/documentos/carta/nova?pessoa=${person.id}`} className="button button-secondary">
              <FileText size={17} aria-hidden="true" />
              Emitir carta de recomendação
            </Link>
            <Link to={`/pessoas/${person.id}/carteirinha`} className="button button-primary">
              <IdCardIcon size={18} aria-hidden="true" />
              Gerar carteirinha
            </Link>
          </div>
        }
      />

      <section className="panel person-sheet" aria-label="Ficha">
        <div className="person-photo">
          {person.photo ? (
            <img src={person.photo} alt={`Foto de ${person.name}`} />
          ) : (
            <span aria-hidden="true">{initials(person.name)}</span>
          )}
        </div>
        <dl className="details-list person-fields">
          <div>
            <dt>Nome</dt>
            <dd>{person.name}</dd>
          </div>
          <div>
            <dt>Matrícula</dt>
            <dd>{person.registration}</dd>
          </div>
          <div>
            <dt>Classificação</dt>
            <dd>{PERSON_CLASS_LABELS[person.classification]}</dd>
          </div>
          <div>
            <dt>Congregação</dt>
            <dd>{person.congregation}</dd>
          </div>
          <div>
            <dt>Contato</dt>
            <dd>{person.phone ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt>Foto</dt>
            <dd>{person.photo ? 'Anexada' : 'Sem foto'}</dd>
          </div>
        </dl>
      </section>

      <PersonFormDialog open={editing} person={person} onClose={() => setEditing(false)} />
    </>
  );
}

export function PersonNotFound() {
  return (
    <>
      <Link to="/pessoas" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Pessoas
      </Link>
      <section className="panel">
        <h1 className="not-found-title">Cadastro não encontrado</h1>
        <p className="empty-text">Esta pessoa não está mais na lista. Volte para Pessoas e escolha outro cadastro.</p>
      </section>
    </>
  );
}
