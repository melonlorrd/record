import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/storeContext';
import { AssetClass, PortfolioHolding } from '../../domain/types';
import { calculatePortfolioSummary, calculateRunningBalance, getActiveEntries } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { AddHoldingModal } from './AddHoldingModal';

export const PortfolioView: React.FC = () => {
  const { holdings, entries } = useStore();

  const [filterClass, setFilterClass] = useState<AssetClass | 'ALL'>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);

  const summary = useMemo(() => {
    return calculatePortfolioSummary(holdings);
  }, [holdings]);

  // Calculate liquid savings from ledger running balance
  const liquidCashCents = useMemo(() => {
    const active = getActiveEntries(entries);
    const pts = calculateRunningBalance(active);
    return pts.length > 0 ? (pts[pts.length - 1]?.balanceCents ?? 0) : 0;
  }, [entries]);

  const totalNetWorthCents = liquidCashCents + summary.totalCurrentValueCents;

  const filteredHoldings = useMemo(() => {
    if (filterClass === 'ALL') return summary.holdings;
    return summary.holdings.filter((h) => h.assetClass === filterClass);
  }, [summary.holdings, filterClass]);

  const assetClassLabel = (ac: AssetClass): { label: string; icon: string; badgeClass: string } => {
    switch (ac) {
      case 'mutual_fund':
        return { label: 'Mutual Fund', icon: '📊', badgeClass: 'badge-mf' };
      case 'equity':
        return { label: 'Equity / Stock', icon: '📈', badgeClass: 'badge-equity' };
      case 'gold':
        return { label: 'Gold / SGB', icon: '🥇', badgeClass: 'badge-gold' };
    }
  };

  return (
    <div className="portfolio-view">
      {/* Portfolio Header */}
      <div className="section-header-row card">
        <div>
          <h2>Investment Portfolio</h2>
          <p className="text-muted">
            Track your Mutual Funds, Equities, and Gold holdings with live valuation and net worth.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingHolding(null);
            setIsAddOpen(true);
          }}
        >
          + Add Holding
        </button>
      </div>

      {/* Net Worth & Portfolio Headline Stat Tiles */}
      <div className="stat-tiles-grid">
        {/* Total Net Worth (Liquid Cash + Portfolio Value) */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Net Worth</span>
            <span className="stat-icon">💎</span>
          </div>
          <div className="stat-value income-text">
            {formatINR(totalNetWorthCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer text-muted">
            Includes {formatINR(liquidCashCents, { compactIfZeroPaise: true })} liquid savings
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Portfolio Value</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-value">
            {formatINR(summary.totalCurrentValueCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer text-muted">
            Across {summary.activeHoldingsCount} active holdings
          </div>
        </div>

        {/* Invested Amount */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Invested</span>
            <span className="stat-icon">💼</span>
          </div>
          <div className="stat-value">
            {formatINR(summary.totalInvestedCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer text-muted">Principal cost basis</div>
        </div>

        {/* Unrealized Gain */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Gain / Returns</span>
            <span className="stat-icon">{summary.totalGainCents >= 0 ? '🚀' : '🔻'}</span>
          </div>
          <div className={`stat-value ${summary.totalGainCents >= 0 ? 'income-text' : 'expense-text'}`}>
            {summary.totalGainCents >= 0 ? '+' : ''}
            {formatINR(summary.totalGainCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer">
            <span className={`trend-pill ${summary.totalGainCents >= 0 ? 'trend-up-good' : 'trend-down-bad'}`}>
              {summary.totalGainCents >= 0 ? '+' : ''}{summary.totalGainPercent}%
            </span>
            <span className="stat-footer-text">overall profit</span>
          </div>
        </div>
      </div>

      {/* Asset Allocation Bar */}
      <div className="card chart-card">
        <div className="chart-header">
          <div>
            <h3>Asset Class Allocation</h3>
            <span className="text-muted small-text">
              Balanced spread across Mutual Funds, Equities, and Gold
            </span>
          </div>
        </div>

        <div className="asset-allocation-bar-track">
          {summary.allocation.map((item) => {
            if (item.percentage <= 0) return null;
            return (
              <div
                key={item.assetClass}
                className="allocation-bar-segment"
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                title={`${item.label}: ${formatINR(item.totalCurrentValueCents)} (${item.percentage}%)`}
              />
            );
          })}
        </div>

        <div className="allocation-legend-grid">
          {summary.allocation.map((item) => (
            <div key={item.assetClass} className="allocation-legend-item">
              <span className="pill-dot" style={{ backgroundColor: item.color }} />
              <span className="font-semibold">{item.label}:</span>
              <span>{formatINR(item.totalCurrentValueCents, { compactIfZeroPaise: true })}</span>
              <span className="text-muted">({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings Filter Tabs */}
      <div className="ledger-controls card">
        <div className="portfolio-filter-row">
          <div className="segmented-control" role="radiogroup">
            <button
              type="button"
              className={`segmented-btn ${filterClass === 'ALL' ? 'active-income' : ''}`}
              onClick={() => setFilterClass('ALL')}
            >
              All Assets ({summary.activeHoldingsCount})
            </button>
            <button
              type="button"
              className={`segmented-btn ${filterClass === 'mutual_fund' ? 'active-income' : ''}`}
              onClick={() => setFilterClass('mutual_fund')}
            >
              📊 Mutual Funds
            </button>
            <button
              type="button"
              className={`segmented-btn ${filterClass === 'equity' ? 'active-income' : ''}`}
              onClick={() => setFilterClass('equity')}
            >
              📈 Equity
            </button>
            <button
              type="button"
              className={`segmented-btn ${filterClass === 'gold' ? 'active-income' : ''}`}
              onClick={() => setFilterClass('gold')}
            >
              🥇 Gold
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingHolding(null);
              setIsAddOpen(true);
            }}
          >
            + Add Holding
          </button>
        </div>
      </div>

      {/* Holdings List: Cards on phone, table on wide screens */}
      {filteredHoldings.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">💼</div>
          <h3>No investments in this category</h3>
          <p>Add your first mutual fund, equity, or gold position to start tracking.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingHolding(null);
              setIsAddOpen(true);
            }}
          >
            + Add Investment
          </button>
        </div>
      ) : (
        <div className="transactions-container">
          {/* Mobile Cards */}
          <div className="mobile-cards-list">
            {filteredHoldings.map((h) => {
              const meta = assetClassLabel(h.assetClass);
              const isProfit = h.gainCents >= 0;

              return (
                <div
                  key={h.id}
                  className="entry-card card"
                  onClick={() => setEditingHolding(h)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="entry-card-left">
                    <span className="holding-icon-badge">{meta.icon}</span>
                    <div className="entry-details">
                      <div className="entry-title-row">
                        <span className="entry-note">{h.name}</span>
                        <span className={`asset-class-badge ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="entry-subtitle-row">
                        <span>{h.units} units</span>
                        <span className="entry-dot-separator">•</span>
                        <span>Avg ₹{(h.buyAvgPriceCents / 100).toFixed(2)}</span>
                        <span className="entry-dot-separator">•</span>
                        <span>Current ₹{(h.currentNavOrPriceCents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="entry-card-right">
                    <span className="entry-amount font-semibold">
                      {formatINR(h.currentValueCents, { compactIfZeroPaise: true })}
                    </span>
                    <span className={`gain-pill ${isProfit ? 'profit-text' : 'loss-text'}`}>
                      {isProfit ? '+' : ''}{formatINR(h.gainCents, { compactIfZeroPaise: true })} ({isProfit ? '+' : ''}{h.gainPercent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wide Screen Table */}
          <div className="desktop-table-wrapper card">
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Class</th>
                  <th>Quantity</th>
                  <th>Avg Buy (₹)</th>
                  <th>Current Price (₹)</th>
                  <th className="text-right">Invested</th>
                  <th className="text-right">Current Value</th>
                  <th className="text-right">Gain / Loss</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((h) => {
                  const meta = assetClassLabel(h.assetClass);
                  const isProfit = h.gainCents >= 0;

                  return (
                    <tr key={h.id}>
                      <td>
                        <div className="holding-table-name">
                          <span className="font-semibold">{h.name}</span>
                          {h.symbolOrFolio && (
                            <span className="text-muted small-text">{h.symbolOrFolio}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`asset-class-badge ${meta.badgeClass}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="font-medium">{h.units}</td>
                      <td className="text-muted">₹{(h.buyAvgPriceCents / 100).toFixed(2)}</td>
                      <td className="font-medium">₹{(h.currentNavOrPriceCents / 100).toFixed(2)}</td>
                      <td className="text-right text-muted">{formatINR(h.investedCents)}</td>
                      <td className="text-right font-semibold">{formatINR(h.currentValueCents)}</td>
                      <td className={`text-right font-semibold ${isProfit ? 'income-text' : 'expense-text'}`}>
                        {isProfit ? '+' : ''}{formatINR(h.gainCents)}
                        <div className="small-text">
                          ({isProfit ? '+' : ''}{h.gainPercent}%)
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setEditingHolding(h)}
                          title="Edit holding"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddHoldingModal
        isOpen={isAddOpen || !!editingHolding}
        editingHolding={editingHolding}
        onClose={() => {
          setIsAddOpen(false);
          setEditingHolding(null);
        }}
      />
    </div>
  );
};
