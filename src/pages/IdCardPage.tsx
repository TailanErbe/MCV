import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { IdCard } from '../components/IdCard';
import { PageHeader } from '../components/ui';
import { useStore } from '../state/store';
import { PersonNotFound } from './PersonDetail';

export function IdCardPage() {
  const { id } = useParams();
  const { data } = useStore();
  const person = data.people.find((p) => p.id === id);

  if (!person) return <PersonNotFound />;

  return (
    <>
      <Link to={`/pessoas/${person.id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Ficha de {person.name}
      </Link>
      <PageHeader
        title="Carteirinha"
        description={`Gerada a partir da ficha de ${person.name}. Para mudar algum dado, edite o cadastro.`}
        actions={
          <button type="button" className="button button-primary" onClick={() => window.print()}>
            <Printer size={18} aria-hidden="true" />
            Imprimir / salvar em PDF
          </button>
        }
      />
      <p className="print-hint">
        Impressa no tamanho de um cartão (85,6 × 54 mm). Para gerar o PDF, escolha “Salvar como PDF” na janela de
        impressão.
        {!person.photo && ' Esta pessoa ainda não tem foto; anexe uma em Editar cadastro.'}
      </p>
      <div className="idc-stage">
        <IdCard person={person} churchName={data.settings.churchName} />
      </div>
    </>
  );
}
