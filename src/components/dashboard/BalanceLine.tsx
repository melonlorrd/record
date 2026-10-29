import React, { useMemo } from 'react';
import { BalancePoint } from '../../domain/analytics';
import { formatDateLabel } from '../../domain/dates';
import { formatINR, getCurrencySymbol, getActiveCurrency } from '../../domain/money';
import { EChartWrapper } from '../common/EChartWrapper';

export interface BalanceLineProps {
  balancePoints: BalancePoint[];
}

export const BalanceLine: React.FC<BalanceLineProps> = ({ balancePoints }) => {
  const options = useMemo(() => {
    const dates = balancePoints.map((p) => formatDateLabel(p.epochMs, p.tz));
    const values = balancePoints.map((p) => p.balanceCents / 100);
    const currencySym = getCurrencySymbol(getActiveCurrency());

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex as number;
          const pt = balancePoints[idx];
          if (!pt) return '';

          return `<div style="font-weight:600;margin-bottom:4px;">${formatDateLabel(pt.epochMs, pt.tz)}</div>
            <div style="margin-bottom:2px;">Balance: <b>${formatINR(pt.balanceCents)}</b></div>
            <div style="font-size:12px;color:#94a3b8;">${pt.note || (pt.deltaCents > 0 ? 'Income' : 'Expense')} (${pt.deltaCents > 0 ? '+' : ''}${formatINR(pt.deltaCents)})</div>`;
        },
      },
      grid: {
        top: 20,
        left: '3%',
        right: '4%',
        bottom: 25,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#64748b' } },
        axisLabel: {
          showMaxLabel: true,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => `${currencySym}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
        },
        splitLine: {
          lineStyle: { color: 'rgba(100, 116, 139, 0.15)' },
        },
      },
      backgroundColor: 'transparent',
      series: [
        {
          name: 'Balance',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: values,
          lineStyle: {
            width: 3,
            color: '#58a6ff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(88, 166, 255, 0.35)' },
                { offset: 1, color: 'rgba(88, 166, 255, 0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [balancePoints]);

  if (balancePoints.length === 0) {
    return (
      <div className="card chart-card">
        <h3>Running Balance</h3>
        <p className="text-muted">No transactions to compute running balance.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Cumulative Running Balance</h3>
        <span className="text-muted small-text">Net worth progression over time</span>
      </div>
      <EChartWrapper options={options} height={260} />
    </div>
  );
};
