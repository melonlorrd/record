import React, { useMemo } from 'react';
import { MonthlyBarItem } from '../../domain/analytics';
import { EChartWrapper } from '../common/EChartWrapper';

export interface MonthlyBarsProps {
  monthlyData: MonthlyBarItem[];
}

export const MonthlyBars: React.FC<MonthlyBarsProps> = ({ monthlyData }) => {
  const options = useMemo(() => {
    const labels = monthlyData.map((d) => d.label);
    const incomeValues = monthlyData.map((d) => d.incomeCents / 100);
    const expenseValues = monthlyData.map((d) => d.expenseCents / 100);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const month = params[0].axisValueLabel;
          let tip = `<div style="font-weight:600;margin-bottom:4px;">${month}</div>`;
          for (const item of params) {
            const val = item.value as number;
            tip += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <span>${item.marker} ${item.seriesName}:</span>
              <span style="font-weight:600;">₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>`;
          }
          return tip;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: 'inherit' },
      },
      grid: {
        top: 20,
        left: '3%',
        right: '4%',
        bottom: 35,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#64748b' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
        },
        splitLine: {
          lineStyle: { color: 'rgba(100, 116, 139, 0.15)' },
        },
      },
      backgroundColor: 'transparent',
      series: [
        {
          name: 'Income',
          type: 'bar',
          data: incomeValues,
          itemStyle: { color: '#2ea043', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 30,
        },
        {
          name: 'Expense',
          type: 'bar',
          data: expenseValues,
          itemStyle: { color: '#f85149', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 30,
        },
      ],
    };
  }, [monthlyData]);

  if (monthlyData.length === 0) {
    return (
      <div className="card chart-card">
        <h3>Monthly Income vs Expense</h3>
        <p className="text-muted">No monthly transaction data available.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Monthly Income vs Expense</h3>
        <span className="text-muted small-text">Overview of cash flow</span>
      </div>
      <EChartWrapper options={options} height={280} />
    </div>
  );
};
