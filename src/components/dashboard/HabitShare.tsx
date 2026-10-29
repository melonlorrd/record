import React, { useMemo } from 'react';
import { HabitWeekItem } from '../../domain/analytics';
import { EChartWrapper } from '../common/EChartWrapper';
import { formatINR, getCurrencySymbol, getActiveCurrency } from '../../domain/money';

export interface HabitShareProps {
  weeks: HabitWeekItem[];
}

export const HabitShare: React.FC<HabitShareProps> = ({ weeks }) => {
  const options = useMemo(() => {
    const labels = weeks.map((w) => w.weekKey);
    const needData = weeks.map((w) => w.needCents / 100);
    const wantData = weeks.map((w) => w.wantCents / 100);
    const impulseData = weeks.map((w) => w.impulseCents / 100);
    const currencySym = getCurrencySymbol(getActiveCurrency());

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const idx = params[0].dataIndex as number;
          const week = weeks[idx];
          if (!week) return '';

          return `<div style="font-weight:600;margin-bottom:4px;">${week.weekKey}</div>
            <div style="color:#10b981;">Need: ${formatINR(week.needCents)} (${week.needSharePercent}%)</div>
            <div style="color:#f59e0b;">Want: ${formatINR(week.wantCents)} (${week.wantSharePercent}%)</div>
            <div style="color:#8b5cf6;">Impulse: ${formatINR(week.impulseCents)} (${week.impulseSharePercent}%)</div>
            <div style="border-top:1px solid #475569;margin-top:4px;padding-top:4px;font-weight:bold;">Total: ${formatINR(week.totalCents)}</div>`;
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
        axisLabel: { interval: 0, rotate: weeks.length > 6 ? 25 : 0 },
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
          name: 'Need',
          type: 'bar',
          stack: 'intent',
          data: needData,
          itemStyle: { color: '#2ea043' },
          barMaxWidth: 32,
        },
        {
          name: 'Want',
          type: 'bar',
          stack: 'intent',
          data: wantData,
          itemStyle: { color: '#d29922' },
          barMaxWidth: 32,
        },
        {
          name: 'Impulse',
          type: 'bar',
          stack: 'intent',
          data: impulseData,
          itemStyle: { color: '#a371f7' },
          barMaxWidth: 32,
        },
      ],
    };
  }, [weeks]);

  if (weeks.length === 0) {
    return (
      <div className="card chart-card">
        <h3>Habit & Intent Trends</h3>
        <p className="text-muted">No intent data available for this range.</p>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>Habit & Intent Trends by Week</h3>
        <span className="text-muted small-text">Track your Need vs Want vs Impulse discipline</span>
      </div>
      <EChartWrapper options={options} height={270} />
    </div>
  );
};
