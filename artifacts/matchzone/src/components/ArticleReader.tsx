import React from 'react';
import { ArrowRight, Calendar, Clock, ExternalLink, Share2, Tag, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import type { LiveNewsArticle } from '../lib/api';

// Cache to make transition between card click and full page instant
const articleMemoryCache = new Map<string, LiveNewsArticle>();

export function cacheArticleForNavigation(article: LiveNewsArticle) {
  if (!article || !article.id) return;
  articleMemoryCache.set(String(article.id), article);
  try {
    sessionStorage.setItem(`mz_article_${article.id}`, JSON.stringify(article));
  } catch {}
}

export function getCachedArticle(id: string): LiveNewsArticle | null {
  if (!id) return null;
  if (articleMemoryCache.has(id)) {
    return articleMemoryCache.get(id)!;
  }
  try {
    const raw = sessionStorage.getItem(`mz_article_${id}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

interface ArticleReaderProps {
  article: LiveNewsArticle;
  onBack?: () => void;
  isModal?: boolean;
}

export function ArticleReader({ article, onBack, isModal = false }: ArticleReaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = React.useMemo(() => {
    if (!article.pubDate) return article.timeAgo || 'اليوم';
    try {
      const d = new Date(article.pubDate);
      if (isNaN(d.getTime())) return article.timeAgo || 'اليوم';
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return article.timeAgo || 'اليوم';
    }
  }, [article.pubDate, article.timeAgo]);

  const sourceName = article.source?.trim() || 'المصدر الرياضي المعتمد';

  // Deduplicate and prepare normal reading paragraphs without repetition or awkward callout boxes
  const readingParagraphs = React.useMemo(() => {
    const cleanList: string[] = [];
    const titleNorm = article.title.trim().replace(/\s+/g, ' ');

    if (Array.isArray(article.content) && article.content.length > 0) {
      for (const p of article.content) {
        const text = (p || '').trim().replace(/\s+/g, ' ');
        if (!text) continue;
        // Don't repeat if it is verbatim the title
        if (text === titleNorm && cleanList.length === 0) continue;
        // Don't duplicate previous text
        if (!cleanList.includes(text)) {
          cleanList.push(text);
        }
      }
    }

    // If no distinct content was found, use excerpt if it is different from title
    if (cleanList.length === 0 && article.excerpt) {
      const excerptClean = article.excerpt.trim().replace(/\s+/g, ' ');
      if (excerptClean && excerptClean !== titleNorm) {
        cleanList.push(excerptClean);
      }
    }

    if (cleanList.length === 0) {
      cleanList.push('يمكنكم متابعة التغطية المباشرة وكافة التفاصيل عبر رابط المصدر الأصلي للخبر أدناه.');
    }

    return cleanList;
  }, [article.content, article.excerpt, article.title]);

  return (
    <article
      className={`article-reader-container ${isModal ? 'article-reader-modal' : ''}`}
      data-testid={`article-reader-${article.id}`}
      dir="rtl"
    >
      {/* Navigation / Top Bar */}
      <div className="article-reader-nav">
        {onBack ? (
          <button
            onClick={onBack}
            className="article-reader-back-btn"
            aria-label="العودة"
            data-testid="btn-back-article"
          >
            <ArrowRight size={18} />
            <span>العودة إلى الأخبار</span>
          </button>
        ) : (
          <Link
            href="/news"
            className="article-reader-back-btn"
            data-testid="link-back-news"
          >
            <ArrowRight size={18} />
            <span>العودة لجميع الأخبار</span>
          </Link>
        )}

        <div className="article-reader-actions">
          <button
            onClick={handleShare}
            className="article-reader-action-btn"
            title="مشاركة المقال"
            aria-label="مشاركة المقال"
            data-testid="btn-share-article"
          >
            <Share2 size={16} />
            <span>{copied ? 'تم النسخ!' : 'مشاركة'}</span>
          </button>
        </div>
      </div>

      {/* Main Reading Surface */}
      <div className="article-reader-surface">
        {/* Header Block: [Category] -> Title -> Metadata */}
        <header className="article-reader-header">
          {/* 1. Category Badge */}
          <div className="article-category-wrap">
            <span className="article-category-badge" data-testid="badge-article-category">
              {article.category}
            </span>
          </div>

          {/* 2. Article Title */}
          <h1 className="article-reader-title" data-testid="article-title">
            {article.title}
          </h1>

          {/* 3. Source • Date • Reading time */}
          <div className="article-reader-meta">
            {/* Real Source from API */}
            <div className="article-source-item" data-testid="article-source">
              <ShieldCheck size={16} className="article-source-icon" />
              <span className="article-source-label">المصدر:</span>
              <strong className="article-source-name">{sourceName}</strong>
            </div>

            <span className="article-meta-bullet">•</span>

            <div className="article-meta-item">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>

            <span className="article-meta-bullet">•</span>

            <div className="article-meta-item">
              <Clock size={14} />
              <span>{article.readTime || '3 دقائق قراءة'}</span>
            </div>
          </div>
        </header>

        {/* Clear Separator 1 */}
        <div className="article-divider" />

        {/* 4. Article Cover Image (16:9, rounded, object-fit: cover) */}
        {article.imageUrl && (
          <div className="article-hero-img-wrap">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="article-hero-img"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = '0.4';
              }}
            />
          </div>
        )}

        {/* Clear Separator 2 */}
        <div className="article-divider" />

        {/* 5. Article Content Column (700-800px comfortable reading width) */}
        <div className="article-reader-body-column">
          {/* Natural Body Paragraphs */}
          <div className="article-reader-content">
            {readingParagraphs.map((paragraph, index) => (
              <p key={index} className="article-body-p">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tags & Real Source Verification Link */}
          <footer className="article-reader-footer">
            {article.tags && article.tags.length > 0 && (
              <div className="article-tags-cluster">
                <span className="article-tags-label">
                  <Tag size={14} />
                  الكلمات الدلالية:
                </span>
                <div className="article-tags-list">
                  {article.tags.map((tag) => (
                    <span key={tag} className="article-tag-item">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {article.sourceUrl && article.sourceUrl !== '#' && (
              <div className="article-source-attribution">
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="article-external-link"
                  data-testid="link-article-original-source"
                >
                  <ExternalLink size={15} />
                  <span>زيارة المصدر الأصلي ({sourceName})</span>
                </a>
              </div>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}
