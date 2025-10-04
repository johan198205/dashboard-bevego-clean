"use client";
import { useState, useEffect } from 'react';
import { TopPageWithCwv } from '@/services/top-pages.service';
import { getTopPagesWithCwv } from '@/services/top-pages-data.service';

type TopPagesTableProps = {
  device: string[];
  className?: string;
};

export default function TopPagesTable({ device, className }: TopPagesTableProps) {
  const [pages, setPages] = useState<TopPageWithCwv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLimit, setCurrentLimit] = useState(10);

  const loadPages = async (limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTopPagesWithCwv(limit, device);
      setPages(data);
    } catch (error) {
      console.error('Error loading top pages:', error);
      setError('Kunde inte ladda sidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages(currentLimit);
  }, [device, currentLimit]);

  const loadMore = () => {
    setCurrentLimit(prev => prev + 10);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pass':
        return 'text-green-600 bg-green-100';
      case 'Needs Improvement':
        return 'text-yellow-600 bg-yellow-100';
      case 'Fail':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getValueColor = (status: string) => {
    switch (status) {
      case 'Pass':
        return 'text-green-600 font-semibold';
      case 'Needs Improvement':
        return 'text-yellow-600 font-semibold';
      case 'Fail':
        return 'text-red-600 font-semibold';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pass':
        return 'Pass';
      case 'Needs Improvement':
        return 'Behöver förbättring';
      case 'Fail':
        return 'Misslyckad';
      default:
        return 'Okänd';
    }
  };

  const getOverallStatus = (lcpStatus: string, inpStatus: string, clsStatus: string, ttfbStatus: string) => {
    const statuses = [lcpStatus, inpStatus, clsStatus, ttfbStatus];
    
    // Priority: Fail > Needs Improvement > Pass
    if (statuses.includes('Fail')) return 'Fail';
    if (statuses.includes('Needs Improvement')) return 'Needs Improvement';
    return 'Pass';
  };

  const calculateTotalScore = (lcpStatus: string, inpStatus: string, clsStatus: string, ttfbStatus: string) => {
    // Score system: Pass = 3, Needs Improvement = 2, Fail = 1
    const getScore = (status: string) => {
      switch (status) {
        case 'Pass': return 3;
        case 'Needs Improvement': return 2;
        case 'Fail': return 1;
        default: return 0;
      }
    };

    const lcpScore = getScore(lcpStatus);
    const inpScore = getScore(inpStatus);
    const clsScore = getScore(clsStatus);
    const ttfbScore = getScore(ttfbStatus);

    // Calculate weighted average (all metrics equally important)
    const totalScore = (lcpScore + inpScore + clsScore + ttfbScore) / 4;
    
    // Convert to percentage (0-100)
    return Math.round((totalScore / 3) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 font-semibold';
    if (score >= 50) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 75) return 'Pass';
    if (score >= 50) return 'Needs Improvement';
    return 'Fail';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('sv-SE').format(num);
  };

  const formatBounceRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading && pages.length === 0) {
    return (
      <div className={`card ${className}`}>
        <h3 className="title mb-4">Detalj per sida</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-2">Laddar sidor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <h3 className="title mb-4">Detalj per sida</h3>
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <h3 className="title mb-4">Detalj per sida</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">URL</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">LCP p75</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">INP p75</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">CLS p75</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">TTFB p75</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Total Score</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Sessions</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Senast testad</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Källa</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page, index) => (
              <tr key={index} className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-2">
                <td className="py-3 px-4">
                  <div className="max-w-xs truncate" title={page.pagePath}>
                    {page.pagePath}
                  </div>
                </td>
                <td className="text-center py-3 px-4">
                  {page.cwvData.lcp.p75 > 0 ? (
                    <span className={getValueColor(page.cwvData.lcp.status)}>
                      {page.cwvData.lcp.p75} ms
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {page.cwvData.inp.p75 > 0 ? (
                    <span className={getValueColor(page.cwvData.inp.status)}>
                      {page.cwvData.inp.p75} ms
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {page.cwvData.cls.p75 > 0 ? (
                    <span className={getValueColor(page.cwvData.cls.status)}>
                      {page.cwvData.cls.p75.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {page.cwvData.ttfb.p75 > 0 ? (
                    <span className={getValueColor(page.cwvData.ttfb.status)}>
                      {page.cwvData.ttfb.p75} ms
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {(() => {
                    const totalScore = calculateTotalScore(
                      page.cwvData.lcp.status,
                      page.cwvData.inp.status,
                      page.cwvData.cls.status,
                      page.cwvData.ttfb.status
                    );
                    return (
                      <span className={getScoreColor(totalScore)}>
                        {totalScore}%
                      </span>
                    );
                  })()}
                </td>
                <td className="text-center py-3 px-4">
                  {(() => {
                    const totalScore = calculateTotalScore(
                      page.cwvData.lcp.status,
                      page.cwvData.inp.status,
                      page.cwvData.cls.status,
                      page.cwvData.ttfb.status
                    );
                    const scoreStatus = getScoreStatus(totalScore);
                    return (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(scoreStatus)}`}>
                        {getStatusText(scoreStatus)}
                      </span>
                    );
                  })()}
                </td>
                <td className="text-center py-3 px-4">
                  {formatNumber(page.sessions)}
                </td>
                <td className="text-center py-3 px-4 text-sm text-gray-500">
                  {page.cwvData.lastTested}
                </td>
                <td className="text-center py-3 px-4 text-sm text-gray-500">
                  {page.cwvData.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Laddar...
              </>
            ) : (
              'Ladda fler'
            )}
          </button>
        </div>
      )}

      {pages.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Inga sidor hittades</p>
        </div>
      )}
    </div>
  );
}
