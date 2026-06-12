// Carte de validation (T6) : le verdict d'une réponse face au schéma actif —
// verte si conforme, rouge avec la liste précise des violations sinon.
// Utilisée sous la réponse unique de L2, dans la modale de la galerie ×N et
// dans le mode test de l'éditeur de schéma.

import type { ValidationResult } from '../../schema/validate'

export function ValidationCard({ result }: { result: ValidationResult }) {
  if (result.status === 'valid') {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
        <p className="font-medium">✓ Conforme au schéma</p>
        <p className="mt-0.5 text-emerald-700">
          La réponse est un objet JSON qui respecte le contrat de sortie.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-medium">✗ Non conforme au schéma</p>
      {result.status === 'not_json' ? (
        <p className="mt-0.5 text-red-700">{result.message}</p>
      ) : (
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-red-700">
          {result.violations.map((violation, i) => (
            <li key={i}>{violation.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
