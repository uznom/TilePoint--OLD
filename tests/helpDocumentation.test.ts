import { describe, it, expect } from 'vitest';
import {
  DOCS_CATEGORIES,
  ALL_DOC_ARTICLES,
  DocArticle,
  DocCategory,
  DocSection
} from '../src/components/tutorials/docsData';

describe('Help & Documentation (Fumadocs-Inspired) Knowledge Base Suite', () => {
  describe('1. Documentation Data Integrity & Completeness', () => {
    it('contains all 8 required operational categories', () => {
      const categoryIds = DOCS_CATEGORIES.map(c => c.id);
      expect(categoryIds).toContain('getting-started');
      expect(categoryIds).toContain('pos-billing');
      expect(categoryIds).toContain('shift-accounting');
      expect(categoryIds).toContain('inventory-warehousing');
      expect(categoryIds).toContain('fleet-deliveries');
      expect(categoryIds).toContain('procurement-vendors');
      expect(categoryIds).toContain('bir-compliance-tax');
      expect(categoryIds).toContain('shortcuts-reference');
    });

    it('ensures every category contains at least one detailed article', () => {
      DOCS_CATEGORIES.forEach(cat => {
        expect(cat.articles.length).toBeGreaterThan(0);
        expect(cat.name).toBeTruthy();
        expect(cat.iconName).toBeTruthy();
      });
    });

    it('guarantees unique IDs across all articles and categories', () => {
      const catIds = new Set<string>();
      DOCS_CATEGORIES.forEach(cat => {
        expect(catIds.has(cat.id)).toBe(false);
        catIds.add(cat.id);
      });

      const articleIds = new Set<string>();
      ALL_DOC_ARTICLES.forEach(art => {
        expect(articleIds.has(art.id)).toBe(false);
        articleIds.add(art.id);
      });
    });

    it('ensures every article has valid sections with headings and content', () => {
      ALL_DOC_ARTICLES.forEach(art => {
        expect(art.title.trim().length).toBeGreaterThan(0);
        expect(art.category.trim().length).toBeGreaterThan(0);
        expect(art.description.trim().length).toBeGreaterThan(0);
        expect(art.readTime).toMatch(/min read/);
        expect(art.sections.length).toBeGreaterThan(0);

        const sectionIds = new Set<string>();
        art.sections.forEach(sec => {
          expect(sec.id).toBeTruthy();
          expect(sectionIds.has(sec.id)).toBe(false);
          sectionIds.add(sec.id);
          expect(sec.heading.trim().length).toBeGreaterThan(0);
          expect(sec.content.trim().length).toBeGreaterThan(0);

          if (sec.callout) {
            expect(['tip', 'note', 'warning', 'danger']).toContain(sec.callout.type);
            expect(sec.callout.title).toBeTruthy();
            expect(sec.callout.message).toBeTruthy();
          }

          if (sec.shortcuts) {
            expect(sec.shortcuts.length).toBeGreaterThan(0);
            sec.shortcuts.forEach(sc => {
              expect(sc.key).toBeTruthy();
              expect(sc.description).toBeTruthy();
            });
          }

          if (sec.table) {
            expect(sec.table.headers.length).toBeGreaterThan(0);
            expect(sec.table.rows.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('2. Real-Time Search & Keyword Indexing', () => {
    const searchArticles = (query: string): DocArticle[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return ALL_DOC_ARTICLES.filter(article => {
        const inTitle = article.title.toLowerCase().includes(q);
        const inDesc = article.description.toLowerCase().includes(q);
        const inCategory = article.category.toLowerCase().includes(q);
        const inKeywords = article.keywords.some(k => k.toLowerCase().includes(q));
        const inSections = article.sections.some(
          s => s.heading.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
        );
        return inTitle || inDesc || inCategory || inKeywords || inSections;
      });
    };

    it('indexes POS and settlement procedures accurately', () => {
      const results = searchArticles('settlement');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'pos-checkout-sop')).toBe(true);
    });

    it('indexes cash drawer variance and float procedures', () => {
      const results = searchArticles('variance');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'shift-drawer-balancing')).toBe(true);
    });

    it('indexes BIR compliance, VAT, and tax ledgers', () => {
      const results = searchArticles('VAT');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'bir-tax-compliance-guide')).toBe(true);
    });

    it('indexes stock transmittals and warehouse logistics', () => {
      const results = searchArticles('transmittal');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'branch-stock-transfers')).toBe(true);
    });

    it('indexes keyboard shortcuts and hotkeys', () => {
      const results = searchArticles('F7');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'keyboard-shortcuts-index' || r.id === 'pos-checkout-sop')).toBe(true);
    });
  });

  describe('3. In-App Module Deep Navigation Links', () => {
    const validAppTabs = [
      'pos',
      'stocks',
      'shift',
      'deliveries',
      'procurement',
      'birReports',
      'dashboard',
      'expenses',
      'adminProfit'
    ];

    it('ensures all targetTab mappings point to valid TilePoint routes', () => {
      ALL_DOC_ARTICLES.forEach(art => {
        if (art.targetTab) {
          expect(validAppTabs).toContain(art.targetTab);
          expect(art.targetTabLabel).toBeTruthy();
        }
      });
    });
  });
});
