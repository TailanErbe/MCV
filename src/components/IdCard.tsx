import { PERSON_CLASS_LABELS } from '../data/labels';
import type { Person } from '../data/types';
import { initials } from '../lib/text';

const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo-igreja.jpeg`;

/** Modelo único de carteirinha, lido diretamente da ficha da pessoa. */
export function IdCard({ person, churchName }: { person: Person; churchName: string }) {
  return (
    <div className="idc" role="img" aria-label={`Carteirinha de demonstração de ${person.name}, matrícula ${person.registration}`}>
      <div className="idc-top">
        <img src={LOGO_SRC} width={1600} height={834} alt={churchName} className="idc-logo" />
        <div className="idc-title">
          <strong>Carteirinha</strong>
          <span>Modelo de demonstração</span>
        </div>
      </div>
      <div className="idc-body">
        <span className="idc-watermark" aria-hidden="true">
          DEMONSTRAÇÃO
        </span>
        <div className="idc-photo">
          {person.photo ? <img src={person.photo} alt="" /> : <span>{initials(person.name)}</span>}
        </div>
        <dl className="idc-fields">
          <div className="idc-name">
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
        </dl>
      </div>
      <div className="idc-band">DEMONSTRAÇÃO • dados fictícios • sem validade oficial</div>
    </div>
  );
}
