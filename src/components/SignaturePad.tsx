import { useRef, useState, type PointerEvent } from 'react';
import type { Signatory } from '../data/types';
import { Modal } from './ui';

/**
 * Assinatura ilustrativa desenhada com dedo ou mouse.
 * Cada abertura começa em branco: um desenho nunca é reaproveitado em outro documento.
 */
export function SignatureDialog({
  open,
  signer,
  documentLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  signer: Signatory;
  documentLabel: string;
  onCancel: () => void;
  onConfirm: (image: string) => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="signature-title" className="modal-form">
      {open && <SignatureForm signer={signer} documentLabel={documentLabel} onCancel={onCancel} onConfirm={onConfirm} />}
    </Modal>
  );
}

function SignatureForm({
  signer,
  documentLabel,
  onCancel,
  onConfirm,
}: {
  signer: Signatory;
  documentLabel: string;
  onCancel: () => void;
  onConfirm: (image: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string>();

  function context(reset = false): CanvasRenderingContext2D | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (reset || canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1b2a3a';
    }
    return ctx;
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sem captura o traço continua funcionando enquanto o ponteiro estiver na área.
    }
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = context();
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) {
      setHasInk(true);
      setError(undefined);
    }
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const ctx = context(true);
    const canvas = canvasRef.current;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function confirm() {
    if (!hasInk) {
      setError('Desenhe a assinatura antes de confirmar.');
      return;
    }
    if (!checked) {
      setError('Confirme que conferiu o texto e o signatário.');
      return;
    }
    onConfirm(canvasRef.current!.toDataURL('image/png'));
  }

  return (
    <>
      <h2 id="signature-title">Assinar como {signer.role.toLowerCase()}</h2>
      <dl className="details-list signature-summary">
        <div>
          <dt>Documento</dt>
          <dd>{documentLabel}</dd>
        </div>
        <div>
          <dt>Signatário</dt>
          <dd>
            {signer.name} · {signer.role}
          </dd>
        </div>
      </dl>
      <p className="field-hint">
        Assinatura ilustrativa para a demonstração. Não use uma assinatura real. O desenho fica ligado só a esta versão
        do documento.
      </p>
      <canvas
        ref={canvasRef}
        className={`signature-canvas ${hasInk ? 'has-ink' : ''}`}
        aria-label="Área para desenhar a assinatura com o dedo ou o mouse"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            setError(undefined);
          }}
        />
        Conferi o texto do documento e o signatário.
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions dialog-actions-split">
        <button type="button" className="button button-ghost" onClick={clear}>
          Limpar
        </button>
        <div>
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="button button-primary" onClick={confirm}>
            Confirmar assinatura
          </button>
        </div>
      </div>
    </>
  );
}
