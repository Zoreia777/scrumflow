interface SkeletonProps {
  label: string;
  lines?: number;
}

/** Indicador de carregamento acessível: o texto é lido por leitores de tela. */
export function LoadingBlock({ label, lines = 3 }: SkeletonProps) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
