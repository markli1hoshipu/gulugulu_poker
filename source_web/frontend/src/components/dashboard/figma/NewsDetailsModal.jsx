import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Clock, User, Tag, Loader2, Sparkles, FileText, Download } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { fetchFullArticle, analyzeNewsArticle } from '../../../services/newsApi';

const NewsDetailsModal = ({ isOpen, onClose, article, onGetAISummary }) => {
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Full article content state
  const [fullArticle, setFullArticle] = useState(null);
  const [loadingFullArticle, setLoadingFullArticle] = useState(false);
  const [fullArticleError, setFullArticleError] = useState(null);

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Reset state when modal opens with new article
  useEffect(() => {
    if (isOpen && article) {
      setAiSummary(null);
      setSummaryError(null);
      setLoadingSummary(false);
      setFullArticle(null);
      setFullArticleError(null);
      setLoadingFullArticle(false);
      setAnalysis(null);
      setAnalysisError(null);
      setLoadingAnalysis(false);
    }
  }, [isOpen, article]);

  const handleGetFullArticle = async () => {
    if (!article || loadingFullArticle) return;

    setLoadingFullArticle(true);
    setFullArticleError(null);

    try {
      console.log('📄 Requesting full article for:', article.url);
      const fullContent = await fetchFullArticle(article.url);

      console.log('📄 Full article response received:', fullContent);

      // Always set the full article, even if extraction failed
      setFullArticle(fullContent);

      // If extraction failed, show a warning but don't treat it as an error
      if (!fullContent.success || fullContent.extraction_error) {
        console.warn('📄 Article extraction had issues:', fullContent.extraction_error);
        // Don't set error state, just let the user see the fallback content
      }
    } catch (error) {
      console.error('Error getting full article:', error);
      setFullArticleError(error.message || 'Failed to fetch full article content');
    } finally {
      setLoadingFullArticle(false);
    }
  };

  const handleGetAISummary = async () => {
    if (!article || loadingSummary) return;
    
    setLoadingSummary(true);
    setSummaryError(null);
    
    try {
      console.log('🤖 Requesting AI summary for:', article.title);
      const summary = await onGetAISummary(article);
      setAiSummary(summary);
    } catch (error) {
      console.error('Error getting AI summary:', error);
      setSummaryError(error.message || 'Failed to generate AI summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGetAnalysis = async () => {
    if (!article || loadingAnalysis) return;

    setLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      console.log('🔍 Requesting analysis for:', article.title);

      // 首先获取完整文章内容（如果还没有）
      let articleWithContent = article;
      if (!article.full_content && article.url) {
        console.log('📄 Fetching full article content first...');
        try {
          const fullArticleResult = await fetchFullArticle(article.url);
          if (fullArticleResult.success && fullArticleResult.result) {
            articleWithContent = {
              ...article,
              full_content: fullArticleResult.result.content || fullArticleResult.result.full_content
            };
            console.log('📄 Full article content fetched successfully');
          }
        } catch (contentError) {
          console.warn('📄 Could not fetch full content, proceeding with available content:', contentError);
        }
      }

      // 然后进行AI分析
      const analysisResult = await analyzeNewsArticle(articleWithContent);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('🔍 Error getting analysis:', error);
      setAnalysisError(error.message || 'Failed to analyze article');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">News Article Details</h2>
              <p className="text-sm text-gray-500">AI-powered news analysis</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Article Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="font-medium">
                {article.category?.charAt(0).toUpperCase() + article.category?.slice(1) || 'News'}
              </Badge>
              {article.trending && (
                <Badge variant="default" className="bg-orange-100 text-orange-800 border-orange-200">
                  🔥 Trending
                </Badge>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{article.source}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{article.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{article.readTime}</span>
              </div>
            </div>
          </div>

          {/* Article Image */}
          {article.imageUrl && (
            <div className="mb-6">
              <img 
                src={article.imageUrl} 
                alt={article.title}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* AI Business Analysis Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Business Analysis</h3>
                </div>
                <Button
                  onClick={handleGetAnalysis}
                  disabled={loadingAnalysis}
                  variant="outline"
                  size="sm"
                >
                  {loadingAnalysis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {analysis ? 'Refresh Analysis' : 'Show Analysis'}
                    </>
                  )}
                </Button>
              </div>

              {analysisError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm">⚠️ {analysisError}</p>
                </div>
              )}

              {analysis && analysis.analysis && (
                <div className="space-y-6">
                  {/* Facts Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      📊 Key Facts
                    </h4>
                    <ul className="space-y-2">
                      {analysis.analysis.facts?.map((fact, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm text-gray-700">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Impact Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      💼 Business Impact
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{analysis.analysis.impact}</p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      🎯 Recommended Actions
                    </h4>
                    <ul className="space-y-2">
                      {analysis.analysis.actions?.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Analysis Metadata */}
                  {analysis.analyzed_at && (
                    <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                      Analysis generated at: {new Date(analysis.analyzed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {!analysis && !loadingAnalysis && !analysisError && (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Click "Show Analysis" to get AI-powered business insights</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Read Full Article
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailsModal;
