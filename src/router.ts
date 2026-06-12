// Routage hash minimal (T10). Le build statique est servi avec `base: './'`
// (file://, GitHub Pages, o2switch) : pas de routage par chemin possible sans
// 404 au rechargement — tout passe par le fragment (#/l1), que le serveur ne
// voit jamais. Fonctions pures, testées ; l'abonnement à `hashchange` vit
// dans App.tsx.

import type { LevelId } from './levels'

/** Pages adressables : l'accueil et les quatre niveaux. */
export type PageId = 'accueil' | LevelId

/**
 * Interprète un fragment d'URL (`location.hash`) en page. Tolérant par
 * construction : casse ignorée, slashes optionnels, et tout fragment inconnu
 * ramène à l'accueil plutôt que d'afficher une page vide.
 */
export function parsePageHash(hash: string): PageId {
  const slug = hash.replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase()
  if (/^l[1-4]$/.test(slug)) {
    return slug.toUpperCase() as LevelId
  }
  return 'accueil'
}

/** Fragment canonique d'une page, utilisable en `href`. */
export function pageHash(page: PageId): string {
  return page === 'accueil' ? '#/' : `#/${page.toLowerCase()}`
}
