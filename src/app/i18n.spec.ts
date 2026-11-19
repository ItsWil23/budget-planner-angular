/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const LOCALE_FILES = import.meta.glob('../../public/i18n/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const TEMPLATE_FILES = import.meta.glob(
  ['./pages/transactions/*.html', './components/ui/transaction-list/*.html', './components/ui/undo-toast/*.html'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

type Translations = { [key: string]: Translations | string };

function loadLocale(name: 'fr' | 'en'): Translations {
  const entry = Object.entries(LOCALE_FILES).find(([path]) => path.endsWith(`/${name}.json`));
  if (!entry) throw new Error(`Fichier de traduction introuvable : ${name}.json`);
  return JSON.parse(entry[1]) as Translations;
}

function flatten(node: Translations, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.set(path, value);
    } else {
      for (const [childPath, childValue] of flatten(value, path)) result.set(childPath, childValue);
    }
  }
  return result;
}

function translocoKeysIn(templates: Record<string, string>): string[] {
  const keys = new Set<string>();
  for (const source of Object.values(templates)) {
    for (const match of source.matchAll(/'([a-zA-Z][\w.]*)'\s*\|\s*transloco/g)) keys.add(match[1]);
  }
  return [...keys].sort();
}

describe('fichiers de traduction', () => {
  const fr = flatten(loadLocale('fr'));
  const en = flatten(loadLocale('en'));

  it('ont les mêmes clés en français et en anglais', () => {
    expect([...fr.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('définissent chaque clé utilisée par les templates modifiés dans les deux langues', () => {
    const keys = translocoKeysIn(TEMPLATE_FILES);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(fr.has(key), `clé absente en français : ${key}`).toBe(true);
      expect(en.has(key), `clé absente en anglais : ${key}`).toBe(true);
    }
  });

  it('n’annonce pas la durée d’annulation dans le message de suppression', () => {
    for (const locale of [fr, en]) {
      const message = locale.get('transactions.deleteMessage') ?? '';
      expect(message).toContain('{{label}}');
      expect(message).not.toMatch(/\d/);
      expect(message).not.toContain('{{seconds}}');
    }
  });
});
