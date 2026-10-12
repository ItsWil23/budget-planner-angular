/**
 * Configuration utilisateur globale : thème, palette, graine du fond, langue, devise et locale.
 */
export interface UserSettings {
  theme: 'dark' | 'light' | 'system';   // défaut : 'dark'
  palette: string;                       // identifiant de palette, défaut = couleur de marque (terracotta)
  backgroundSeed: number;                // mesh gradient : nombre aléatoire figé après premier lancement
  language: 'fr' | 'en';                 // défaut : 'fr'
  currency: string;                      // ISO 4217, défaut 'EUR'
  locale: string;                        // formatage nombres/dates, dérivé de language (défaut 'fr-FR')
}
