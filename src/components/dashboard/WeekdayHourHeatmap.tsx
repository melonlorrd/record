import React, { useMemo } from 'react';
import { HeatmapCell } from '../../domain/analytics';
import { EChartWrapper } from '../common/EChartWrapper';

export interface WeekdayHourHeatmapProps {
  cells: HeatmapCell[];
}

export const WeekdayHourHeatmap: React.FC<WeekdayHourHeatmapProps> = ({ cells }) => {
  const options = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // ECharts heatmap expects data in [xIndex, yIndex, value] format: [hour, weekday, rupees]
    const data: [number, number, number][] = cells.map((cell) => [
      cell.hour,
      cell.weekday,
      cell.totalCents / 100,
    ]);

    const maxSpentRupees = Math.max(100, ...data.map((d) => d[2]));

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [hourIdx, dayIdx, rupees] = params.value as [number, number, number];
          const cell = cells.find((c) => c.hour === hourIdx && c.weekday === dayIdx);
          const count = cell ? cell.count : 0;
          const dayName = days[dayIdx];
          const timeStr = `${hourIdx}:00 - ${hourIdx}:59`;

          return `<div style="font-weight:600;margin-bottom:2px;">${dayName}, ${timeStr}</div>
            <div>Total Spend: <b>₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></div>
            <div style="font-size:12px;color:#94a3b8;">${count} transaction${count === 1 ? '' : 's'}</div>`;
        },
      },
      grid: {
        top: 20,
        bottom: 50,
        left: 45,
        right: 25,
      },
      xAxis: {
        type: 'category',
        data: hours,
        splitArea: { show: true },
        axisLabel: { interval: 2, fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: days,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      backgroundColor: 'transparent',
      visualMap: {
        min: 0,
        max: maxSpentRupees,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 120,
        inRange: {
          color: ['rgba(48, 54, 61, 0.3)', '#58a6ff', '#d29922', '#f85149'],
        },
        textStyle: { color: 'inherit', fontSize: 10 },
        formatter: (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}`,
      },
      series: [
        {
          name: 'Hourly Spend Heatmap',
          type: 'heatmap',
          data,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [cells]);

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Spending Time Patterns</h3>
        <span className="text-muted small-text">Weekday × Hour spend heatmap (using transaction local time)</span>
      </div>
      <EChartWrapper options={options} height={260} />
    </div>
  );
};
