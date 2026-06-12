// Notes pédagogiques du panneau requête (T4) : une note par clé de premier
// niveau du corps JSON envoyé à /v1/messages. Rédaction en français, ton
// accessible PO — 2 à 3 phrases, le mécanisme avant le jargon.

export interface KeyAnnotation {
  /** Intitulé court affiché en tête de note. */
  title: string
  /** La note elle-même, affichable telle quelle. */
  note: string
}

export const REQUEST_ANNOTATIONS: Record<string, KeyAnnotation> = {
  model: {
    title: 'model — quel cerveau répond',
    note:
      'Le modèle qui va traiter la requête. Chaque modèle a son équilibre ' +
      'coût / vitesse / qualité : Haiku est rapide et économique, Sonnet plus ' +
      'capable mais plus cher. Changer cette ligne suffit à changer de modèle.',
  },
  system: {
    title: 'system — le cadre de travail',
    note:
      'Les instructions permanentes données au modèle avant la conversation : ' +
      'son rôle, son ton, ses contraintes. L\'utilisateur ne les voit pas, le ' +
      'modèle les suit pendant tout l\'échange. C\'est le premier levier de ' +
      'structuration (niveau 2).',
  },
  messages: {
    title: 'messages — la conversation',
    note:
      'L\'historique complet de l\'échange, alterné entre "user" et ' +
      '"assistant". L\'API ne garde aucune mémoire entre deux appels : tout ' +
      'le contexte doit être renvoyé ici à chaque fois.',
  },
  temperature: {
    title: 'temperature — la dose de hasard',
    note:
      'Règle la part d\'aléatoire dans le choix de chaque mot, de 0 (le plus ' +
      'déterministe) à 1 (le plus varié). Même à 0, deux réponses peuvent ' +
      'différer — le bouton ×N du niveau 1 le montre.',
  },
  max_tokens: {
    title: 'max_tokens — le plafond de réponse',
    note:
      'Longueur maximale de la réponse, en tokens (un token ≈ ¾ de mot en ' +
      'français). C\'est un disjoncteur de coût : le modèle s\'arrête net ' +
      'quand il l\'atteint, même au milieu d\'une phrase.',
  },
  stream: {
    title: 'stream — la réponse au fil de l\'eau',
    note:
      'Quand cette option vaut true, l\'API renvoie la réponse morceau par ' +
      'morceau (les événements SSE du panneau « flux brut ») au lieu ' +
      'd\'attendre la fin. Indispensable pour afficher le texte qui ' +
      's\'assemble en direct.',
  },
  output_format: {
    title: 'output_format — le contrat de sortie',
    note:
      'Impose au modèle une structure de réponse précise (un schéma JSON) au ' +
      'lieu d\'un texte libre. C\'est ce qui rend la sortie exploitable par un ' +
      'programme — le pivot du niveau 2.',
  },
  tools: {
    title: 'tools — les outils à disposition',
    note:
      'La liste des outils que le modèle peut demander à utiliser (chercher, ' +
      'calculer, interroger une base…). Le modèle ne les exécute pas : il ' +
      'demande, votre code exécute, puis lui renvoie le résultat. Le cœur du ' +
      'niveau 4.',
  },
}

/** Note de repli pour une clé sans annotation dédiée. */
export const UNKNOWN_KEY_ANNOTATION: KeyAnnotation = {
  title: 'Paramètre avancé',
  note:
    'Une option de l\'API sans note dédiée dans cet outil. La documentation ' +
    'de référence : https://docs.claude.com/en/api/messages',
}

export function annotationFor(key: string): KeyAnnotation {
  return REQUEST_ANNOTATIONS[key] ?? UNKNOWN_KEY_ANNOTATION
}
