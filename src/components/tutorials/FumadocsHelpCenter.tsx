/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  ShoppingCart,
  Layers,
  Truck,
  LockKeyhole,
  Printer,
  FileText,
  ShieldCheck,
  Command,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Clock,
  ArrowRight,
  Database,
  HelpCircle,
  X
} from 'lucide-react';
import {
  DocSection,
  DOCS_CATEGORIES,
  ALL_DOC_ARTICLES
} from './docsData';

export interface FumadocsHelpCenterProps {
  darkMode?: boolean;
  onNavigate?: (tab: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  ShoppingCart,
  Layers,
  Truck,
  LockKeyhole,
  Printer,
  FileText,
  ShieldCheck,
  Command,
  AlertCircle,
  Database,
  BookOpen,
  HelpCircle
};

export const FumadocsHelpCenter: React.FC<FumadocsHelpCenterProps> = ({
  onNavigate
}) => {
  const [activeArticleId, setActiveArticleId] = useState<string>('system-overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'getting-started': true,
    'pos-billing': true,
    'shift-accounting': true,
    'inventory-warehousing': true,
    'fleet-deliveries': true,
    'procurement-vendors': true,
    'bir-compliance-tax': true,
    'shortcuts-reference': true
  });

  // Filtered articles based on search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

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
  }, [searchQuery]);

  // Active article resolution
  const activeArticle = useMemo(() => {
    return ALL_DOC_ARTICLES.find(a => a.id === activeArticleId) || ALL_DOC_ARTICLES[0];
  }, [activeArticleId]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleSelectArticle = (articleId: string) => {
    setActiveArticleId(articleId);
    // On mobile or search, clear search or keep it easy to navigate
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCallout = (callout: NonNullable<DocSection['callout']>) => {
    const typeConfigs = {
      tip: {
        border: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        icon: Sparkles
      },
      note: {
        border: 'border-primary/30 bg-primary/5 dark:bg-primary/10 text-primary-950 dark:text-primary-200',
        badge: 'bg-primary/15 text-primary border-primary/30',
        icon: BookOpen
      },
      warning: {
        border: 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 text-amber-950 dark:text-amber-200',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: AlertTriangle
      },
      danger: {
        border: 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 text-rose-950 dark:text-rose-200',
        badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: AlertCircle
      }
    };

    const cfg = typeConfigs[callout.type] || typeConfigs.note;
    const IconComponent = cfg.icon;

    return (
      <div className={`my-4 p-4 rounded-2xl border ${cfg.border} transition-all`}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border font-mono ${cfg.badge}`}>
            <IconComponent className="h-3 w-3" />
            {callout.type.toUpperCase()}
          </span>
          <h5 className="text-xs font-bold text-foreground">{callout.title}</h5>
        </div>
        <p className="text-xs leading-relaxed opacity-90">{callout.message}</p>
      </div>
    );
  };

  const renderShortcuts = (shortcuts: NonNullable<DocSection['shortcuts']>) => {
    return (
      <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {shortcuts.map((sc, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-white/5"
          >
            <span className="text-xs font-medium text-default-600 dark:text-default-400">
              {sc.description}
            </span>
            <kbd className="px-2.5 py-1 text-[11px] font-black font-mono bg-white dark:bg-zinc-900 text-foreground border border-zinc-200 dark:border-white/10 rounded-lg shadow-2xs">
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (table: NonNullable<DocSection['table']>) => {
    return (
      <div className="my-4 overflow-x-auto rounded-xl border border-divider/40">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-foreground font-bold uppercase text-[10px] tracking-wider border-b border-divider/40">
            <tr>
              {table.headers.map((h, i) => (
                <th key={i} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider/20">
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-3 text-default-600 dark:text-default-400 font-medium">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const HeaderIcon = ICON_MAP[activeArticle.iconName] || BookOpen;

  return (
    <div className="space-y-6 w-full text-left" id="fumadocs-help-center">
      {/* Top Search & Category Overview Banner */}
      <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-mono">
              <BookOpen className="h-3 w-3" /> Comprehensive Documentation Hub
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              TilePoint Knowledge Base & SOP Manual
            </h2>
            <p className="text-xs text-default-500 font-medium max-w-2xl">
              Official enterprise standard operating procedures, cashier workflows, inventory accounting, logistics dispatch, and statutory BIR guidelines.
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="w-full md:w-80 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-default-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search procedures, hotkeys, BIR..."
                className="w-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-white/10 pl-9.5 pr-8 py-2.5 rounded-full text-xs text-foreground placeholder:text-default-400 focus:outline-none focus:border-primary transition-all font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-0.5 rounded-full text-default-400 hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Drawer if query present */}
        {searchResults !== null && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/50 dark:border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-default-500 px-1">
              <span>Found {searchResults.length} matching documentation {searchResults.length === 1 ? 'article' : 'articles'}</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline cursor-pointer font-bold"
              >
                Clear Filter
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {searchResults.map(article => (
                <button
                  key={article.id}
                  onClick={() => {
                    handleSelectArticle(article.id);
                    setSearchQuery('');
                  }}
                  className="p-2.5 text-left rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="text-[9.5px] uppercase font-bold text-primary font-mono">{article.category}</div>
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {article.title}
                  </div>
                  <div className="text-[10.5px] text-default-500 line-clamp-1 mt-0.5">
                    {article.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Documentation Two-Column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Category & Article Sidebar Tree */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-divider/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 font-mono">
                Manual Table of Contents
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">
                {ALL_DOC_ARTICLES.length} Articles
              </span>
            </div>

            <div className="space-y-1.5">
              {DOCS_CATEGORIES.map(category => {
                const CatIcon = ICON_MAP[category.iconName] || BookOpen;
                const isExpanded = Boolean(expandedCategories[category.id]);

                return (
                  <div key={category.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <CatIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          {category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-default-400">
                        <span className="text-[10px] font-mono font-bold">
                          {category.articles.length}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="pl-4 pr-1 space-y-1 border-l-2 border-primary/20 ml-3">
                        {category.articles.map(article => {
                          const isSelected = article.id === activeArticle.id;
                          return (
                            <button
                              key={article.id}
                              onClick={() => handleSelectArticle(article.id)}
                              className={`w-full text-left p-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                  : 'text-default-600 dark:text-default-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                              }`}
                            >
                              <span className="truncate pr-2">{article.title}</span>
                              {isSelected ? (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              ) : (
                                <span className="text-[9.5px] font-mono opacity-60 shrink-0">
                                  {article.readTime.replace(' read', '')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Article Content Reading View */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft overflow-hidden">
          {/* Article Header */}
          <div className="p-6 sm:p-8 border-b border-divider/20 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-default-400">
              <span>TilePoint Docs</span>
              <ChevronRight className="h-3 w-3" />
              <span>{activeArticle.category}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary font-bold">{activeArticle.title}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <HeaderIcon className="h-5 w-5" />
                  </div>
                  <div>
                    {activeArticle.badge && (
                      <span className="text-[9.5px] font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        {activeArticle.badge}
                      </span>
                    )}
                    <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
                      {activeArticle.title}
                    </h1>
                  </div>
                </div>
                <p className="text-xs text-default-500 font-medium leading-relaxed max-w-2xl pt-1">
                  {activeArticle.description}
                </p>
              </div>

              {/* Action Button: Jump to Live Module */}
              {activeArticle.targetTab && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(activeArticle.targetTab!)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_8px_rgba(0,111,238,0.25)] active:scale-95 cursor-pointer font-mono shrink-0"
                >
                  <span>{activeArticle.targetTabLabel || 'Open Module'}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-default-400 border-t border-divider/15">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" /> {activeArticle.readTime}
              </span>
              <span>•</span>
              <span>{activeArticle.sections.length} Sections</span>
            </div>
          </div>

          {/* On-Page Table of Contents Pills */}
          <div className="px-6 sm:px-8 py-3 bg-zinc-100/60 dark:bg-zinc-800/60 border-b border-divider/15 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-default-400 font-mono shrink-0">
              Jump To:
            </span>
            {activeArticle.sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-default-600 dark:text-default-400 hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 font-sans"
              >
                {sec.heading}
              </a>
            ))}
          </div>

          {/* Article Body Sections */}
          <div className="p-6 sm:p-8 space-y-8">
            {activeArticle.sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="space-y-3 scroll-mt-6">
                <div className="flex items-baseline gap-2 border-b border-divider/20 pb-2">
                  <span className="text-xs font-mono font-black text-primary">
                    0{idx + 1}.
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {section.heading}
                  </h3>
                </div>

                <div className="text-xs text-default-700 dark:text-default-300 leading-relaxed font-sans font-normal">
                  {section.content}
                </div>

                {section.callout && renderCallout(section.callout)}
                {section.shortcuts && renderShortcuts(section.shortcuts)}
                {section.table && renderTable(section.table)}
              </section>
            ))}

            {/* Next / Prev Article Footer */}
            <div className="pt-8 border-t border-divider/20 flex items-center justify-between">
              {(() => {
                const currentIdx = ALL_DOC_ARTICLES.findIndex(a => a.id === activeArticle.id);
                const prevArticle = currentIdx > 0 ? ALL_DOC_ARTICLES[currentIdx - 1] : null;
                const nextArticle = currentIdx < ALL_DOC_ARTICLES.length - 1 ? ALL_DOC_ARTICLES[currentIdx + 1] : null;

                return (
                  <>
                    {prevArticle ? (
                      <button
                        type="button"
                        onClick={() => handleSelectArticle(prevArticle.id)}
                        className="text-left p-3 rounded-xl border border-zinc-200/60 dark:border-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] uppercase font-bold text-default-400 font-mono block">Previous</span>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {prevArticle.title}
                        </span>
                      </button>
                    ) : <div />}

                    {nextArticle && (
                      <button
                        type="button"
                        onClick={() => handleSelectArticle(nextArticle.id)}
                        className="text-right p-3 rounded-xl border border-zinc-200/60 dark:border-white/10 hover:border-primary/50 transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] uppercase font-bold text-default-400 font-mono block">Next Procedure</span>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1 justify-end">
                          {nextArticle.title} <ArrowRight className="h-3 w-3" />
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FumadocsHelpCenter;
