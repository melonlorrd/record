import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/storeContext';
import { AssetClass, PortfolioHolding } from '../../domain/types';
import { calculatePortfolioSummary, calculateRunningBalance, getActiveEntries } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { AddHoldingModal } from './AddHoldingModal';
import {
  PortfolioIcon,
  PlusIcon,
  EditIcon,
} from '../common/Icons';

export const PortfolioView: React.FC = () => {
  const { holdings, entries, currencySymbol } = useStore();

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

  const assetClassLabel = (ac: AssetClass): { label: string; badgeClass: string; color: string } => {
    switch (ac) {
      case 'mutual_fund':
        return { label: 'Mutual Fund', badgeClass: 'badge-mf', color: '#0a84ff' };
      case 'equity':
        return { label: 'Equity / Stock', badgeClass: 'badge-equity', color: '#30d158' };
      case 'gold':
        return { label: 'Physical Gold', badgeClass: 'badge-gold', color: '#ffd60a' };
    }
  };

  return (
    <div className="portfolio-view">
      {/* Portfolio Header */}
      <div className="section-header-row card">
        <div>
          <h2>Investment Portfolio</h2>
          <p className="text-muted">
            Track Mutual Funds, Equities, and Gold holdings with live valuation and net worth.
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
          <PlusIcon size={16} />
          <span>Add Holding</span>
        </button>
      </div>

      {/* Headline Stat Tiles */}
      <div className="stat-tiles-grid">
        {/* Total Net Worth */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Net Worth</span>
          </div>
          <div className="stat-value income-text tabular-nums">
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
          </div>
          <div className="stat-value tabular-nums">
            {formatINR(summary.totalCurrentValueCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer text-muted">
            Across {summary.activeHoldingsCount} active holdings
          </div>
        </div>

        {/* Total Invested */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Invested</span>
          </div>
          <div className="stat-value tabular-nums">
            {formatINR(summary.totalInvestedCents, { compactIfZeroPaise: true })}
          </div>
          <div className="stat-footer text-muted">Principal cost basis</div>
        </div>

        {/* Unrealized Gain */}
        <div className="stat-tile card">
          <div className="stat-tile-header">
            <span className="stat-title">Total Returns</span>
          </div>
          <div className={`stat-value tabular-nums ${summary.totalGainCents >= 0 ? 'income-text' : 'expense-text'}`}>
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
          {summary.allocation.map((item) => {
            const isOverweight = item.driftPercent > 0;
            return (
              <div key={item.assetClass} className="allocation-legend-item">
                <div className="allocation-legend-row">
                  <span className="pill-dot" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold">{item.label}</span>
                </div>
                <div className="allocation-legend-stats">
                  <span className="font-semibold tabular-nums">
                    {formatINR(item.totalCurrentValueCents, { compactIfZeroPaise: true })}
                  </span>
                  <span className="text-muted">({item.percentage}%)</span>
                </div>
                <div className="allocation-drift-row small-text">
                  <span className="text-muted">Target: {item.targetPercent}%</span>
                  <span className={`drift-badge ${isOverweight ? 'overweight' : 'underweight'}`}>
                    Drift: {isOverweight ? `+${item.driftPercent}%` : `${item.driftPercent}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Holdings Filter Segmented Control in Glass Capsule */}
      <div className="portfolio-filter-glass-capsule">
        <div className="segmented-control" role="radiogroup" aria-label="Asset Class Filter">
          <button
            type="button"
            className={`segmented-btn ${filterClass === 'ALL' ? 'active-income' : ''}`}
            onClick={() => setFilterClass('ALL')}
          >
            All ({summary.activeHoldingsCount})
          </button>
          <button
            type="button"
            className={`segmented-btn ${filterClass === 'mutual_fund' ? 'active-income' : ''}`}
            onClick={() => setFilterClass('mutual_fund')}
          >
            Mutual Funds
          </button>
          <button
            type="button"
            className={`segmented-btn ${filterClass === 'equity' ? 'active-income' : ''}`}
            onClick={() => setFilterClass('equity')}
          >
            Equity
          </button>
          <button
            type="button"
            className={`segmented-btn ${filterClass === 'gold' ? 'active-income' : ''}`}
            onClick={() => setFilterClass('gold')}
          >
            Gold
          </button>
        </div>
      </div>

      {/* Holdings Inset-Grouped List */}
      {filteredHoldings.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon-circle">
            <PortfolioIcon size={32} />
          </div>
          <h3 className="empty-state-title">No investments in this asset class</h3>
          <p className="empty-state-subtitle">Add your first mutual fund, equity, or gold position to start tracking.</p>
          <button
            type="button"
            className="glass-add-capsule-btn"
            onClick={() => {
              setEditingHolding(null);
              setIsAddOpen(true);
            }}
          >
            <PlusIcon size={16} />
            <span>Add Position</span>
          </button>
        </div>
      ) : (
        <div className="inset-group-card">
          {filteredHoldings.map((h, idx) => {
            const meta = assetClassLabel(h.assetClass);
            const isProfit = h.gainCents >= 0;

            return (
              <div
                key={h.id}
                className={`inset-row ${idx === filteredHoldings.length - 1 ? 'last-row' : ''}`}
                onClick={() => setEditingHolding(h)}
                role="button"
                tabIndex={0}
              >
                <div className="inset-row-left">
                  <span
                    className="category-dot-specular"
                    style={{ backgroundColor: meta.color }}
                  />
                  <div className="inset-row-text">
                    <div className="row-title-line">
                      <span className="row-primary-label">{h.name}</span>
                      <span className={`asset-class-badge ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="row-subtitle-line">
                      {h.symbolOrFolio && (
                        <>
                          <span className="text-secondary">{h.symbolOrFolio}</span>
                          <span className="dot-sep">•</span>
                        </>
                      )}
                      <span>{h.units} units</span>
                      <span className="dot-sep">•</span>
                      <span>Avg {currencySymbol}{(h.buyAvgPriceCents / 100).toFixed(2)}</span>
                      <span className="dot-sep">•</span>
                      <span>Now {currencySymbol}{(h.currentNavOrPriceCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="inset-row-right">
                  <div className="holding-values-stack">
                    <span className="row-amount tabular-nums">
                      {formatINR(h.currentValueCents, { compactIfZeroPaise: true })}
                    </span>
                    <span className={`gain-pill tabular-nums ${isProfit ? 'profit-text' : 'loss-text'}`}>
                      {isProfit ? '+' : ''}{formatINR(h.gainCents, { compactIfZeroPaise: true })} ({isProfit ? '+' : ''}{h.gainPercent}%)
                    </span>
                  </div>

                  <div className="row-hover-actions">
                    <button
                      type="button"
                      className="row-action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingHolding(h);
                      }}
                      title="Edit holding"
                      aria-label="Edit holding"
                    >
                      <EditIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
