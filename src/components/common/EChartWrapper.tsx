import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStore } from '../../store/storeContext';

// Register only tree-shaken components needed
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export interface EChartWrapperProps {
  options: echarts.EChartsCoreOption;
  height?: number | string;
  className?: string;
}

export const EChartWrapper: React.FC<EChartWrapperProps> = ({
  options,
  height = 300,
  className = '',
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useStore();

  useEffect(() => {
    if (!chartRef.current) return;

    // Dispose old instance on theme change or mount
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const instance = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas',
    });
    chartInstance.current = instance;

    // Responsive auto-resize observer
    const ro = new ResizeObserver(() => {
      instance.resize();
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      instance.dispose();
      chartInstance.current = null;
    };
  }, [theme]);

  // Update chart options
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(options, true);
    }
  }, [options]);

  return (
    <div
      ref={chartRef}
      className={`chart-container ${className}`}
      style={{ width: '100%', height }}
    />
  );
};
