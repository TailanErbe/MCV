import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { PersonFormDialog } from '../components/PersonForm';
import { PageHeader } from '../components/ui';
import { PERSON_CLASS_LABELS } from '../data/labels';
import { initials, normalize } from '../lib/text';
import { useStore } from '../state/store';

export function People() {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const term = normalize(query);
  const people = [...data.people]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .filter((p) => !term || normalize(p.name).includes(term));

  return (
    <>
      <PageHeader
        title="Pessoas"
        description="Cadastro de obreiros, membros, congregados e outros doadores. Clique num nome para abrir a ficha."
        actions={
          <button type="button" className="button button-primary" onClick={() => setCreating(true)}>
            <UserPlus size={18} aria-hidden="true" />
            Cadastrar pessoa
          </button>
        }
      />

      <div className="search-field">
        <label htmlFor="people-search">Pesquisar por nome</label>
        <div className="input-with-icon">
          <Search size={18} aria-hidden="true" />
          <input
            id="people-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite parte do nome"
            autoComplete="off"
          />
        </div>
      </div>

      <p className="result-count" aria-live="polite">
        {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}{' '}
        {term
          ? `${people.length === 1 ? 'encontrada' : 'encontradas'} para “${query.trim()}”`
          : people.length === 1 ? 'cadastrada' : 'cadastradas'}
      </p>

      <section className="panel panel-flush" aria-label="Lista de pessoas">
        {people.length === 0 ? (
          <p className="empty-text panel-pad">Nenhuma pessoa encontrada. Confira a grafia ou pesquise por outra parte do nome.</p>
        ) : (
          <table className="people-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Matrícula</th>
                <th scope="col">Classificação</th>
                <th scope="col">Congregação</th>
                <th scope="col">Contato</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="clickable-row" onClick={() => navigate(`/pessoas/${person.id}`)}>
                  <td className="cell-person">
                    {person.photo ? (
                      <img className="avatar" src={person.photo} alt="" />
                    ) : (
                      <span className="avatar" aria-hidden="true">
                        {initials(person.name)}
                      </span>
                    )}
                    <Link
                      to={`/pessoas/${person.id}`}
                      className="link-button cell-title"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {person.name}
                    </Link>
                  </td>
                  <td className="cell-registration" data-label="Matrícula">{person.registration}</td>
                  <td className="cell-class" data-label="Classificação">{PERSON_CLASS_LABELS[person.classification]}</td>
                  <td className="cell-congregation" data-label="Congregação">{person.congregation}</td>
                  <td className="cell-phone" data-label="Contato">
                    {person.phone ?? <span className="muted">Não informado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PersonFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(person) => navigate(`/pessoas/${person.id}`)}
      />
    </>
  );
}
