export const DOC_LABELS: Record<string, string> = {
  accidentReport: "Rapport d'accident",
  accidentPhoto: "Photo d'accident",
  accidentDocs: "Documents de l'accident",
  caarCashReport: 'Rapport CAAR / CASH',
  expertiseReport: "PV d'expertise",
  workRequest: 'Demande de travail',
};

export function getDocLabel(docKey: string): string {
  return DOC_LABELS[docKey] ?? docKey;
}
