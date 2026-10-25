import React, { useMemo } from 'react';
import { CategoryBreakdownItem } from '../../domain/analytics';
import { formatINR } from '../../domain/money';
import { EChartWrapper } from '../common/EChartWrapper';

export interface CategoryDonutProps {
  breakdown: CategoryBreakdownItem[];
}

export const CategoryDonut: React.FC<CategoryDonutProps> = ({ breakdown }) => {
  const options = useMemo(() => {
    const data = breakdown.map((item) => ({
      name: item.name,
      value: item.totalCents / 100,
      itemStyle: { color: item.color },
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const val = params.value as number;
          const pct = params.percent;
          return `<div style="font-weight:600;margin-bottom:2px;">${params.name}</div>
            <div>₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${pct}%)</div>`;
        },
      },
      legend: {
        show: false,
      },
      series: [
        {
          name: 'Expenses by Category',
          type: 'pie',
          radius: ['50%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data,
        },
      ],
    };
  }, [breakdown]);

  if (breakdown.length === 0) {
    return (
      <div className="card chart-card">
        <h3>Category Breakdown</h3>
        <p className="text-muted">No expense transactions recorded in this period.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Category Breakdown</h3>
        <span className="text-muted small-text">Expense distribution</span>
      </div>

      <div className="category-split-layout">
        <div className="donut-chart-container">
          <EChartWrapper options={options} height={250} />
        </div>

        <div className="top-categories-table-container">
          <table className="mini-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Spent (₹)</th>
                <th className="text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.slice(0, 6).map((item) => (
                <tr key={item.categoryId}>
                  <td>
                    <span className="category-pill">
                      <span className="pill-dot" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                  </td>
                  <td className="text-right font-medium">
                    {formatINR(item.totalCents, { compactIfZeroPaise: true })}
                  </td>
                  <td className="text-right text-muted">{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
