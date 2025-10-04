'use client';

import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { formatNumber } from '@/utils/format';

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type Props = {
  data: Array<{
    key: string;
    sessions: number;
    engagementRatePct: number;
  }>;
  title?: string;
  height?: number;
};

export function CitiesBarChart({ data, title = "Top 5 Städer", height = 300 }: Props) {
  // Get top 5 cities by sessions
  const top5Cities = data
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  // Show message if no data
  if (top5Cities.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Antal sessions per stad</p>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Ingen data tillgänglig
        </div>
      </div>
    );
  }

  const chartData = top5Cities.map(city => ({
    x: city.key === '(not set)' ? 'Okänd plats' : city.key,
    y: Number(city.sessions) || 0
  }));

  // Calculate total for percentage calculation
  const totalSessions = data.reduce((sum, city) => sum + city.sessions, 0);

  // Debug logging
  console.log('CitiesBarChart data:', { top5Cities, chartData, totalSessions });

  const options: ApexOptions = {
    colors: ["#E01E26"], // Primary red from the theme
    chart: {
      fontFamily: "Satoshi, sans-serif",
      type: "bar",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 800,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 3,
        columnWidth: "60%",
        borderRadiusApplication: "end",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts: any) {
        return new Intl.NumberFormat('sv-SE').format(Math.round(val));
      },
      style: {
        fontSize: '12px',
        fontWeight: 500,
        colors: ['#fff']
      },
      offsetY: -5,
    },
    stroke: {
      show: true,
      width: 0,
      colors: ["transparent"],
    },
    xaxis: {
      categories: chartData.map(item => item.x),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: '#374151',
          fontSize: '12px',
          fontFamily: 'Satoshi, sans-serif',
        },
        maxHeight: 60,
        trim: true,
      },
    },
    yaxis: {
      min: 0,
      labels: {
        formatter: function (val: number) {
          return new Intl.NumberFormat('sv-SE').format(Math.round(val));
        },
        style: {
          colors: '#374151',
          fontSize: '12px',
          fontFamily: 'Satoshi, sans-serif',
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    grid: {
      strokeDashArray: 5,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      opacity: 0.9,
    },
    tooltip: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontFamily: 'Satoshi, sans-serif',
      },
      y: {
        formatter: function (val: number, opts: any) {
          const cityData = top5Cities[opts.dataPointIndex];
          return `${new Intl.NumberFormat('sv-SE').format(Math.round(val))} sessions<br/>Engagement: ${cityData.engagementRatePct.toFixed(1)}%`;
        },
        title: {
          formatter: function () {
            return 'Sessions:';
          },
        },
      },
    },
    legend: {
      show: false,
    },
    annotations: {
      points: chartData.map((item, index) => ({
        x: item.x,
        y: item.y,
        marker: {
          size: 0,
        },
        label: {
          text: `${((item.y / totalSessions) * 100).toFixed(1)}%`,
          offsetY: -20,
          style: {
            color: '#374151',
            fontSize: '12px',
            fontWeight: 500,
          },
        },
      })),
    },
  };

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Antal sessions per stad</p>
      </div>
      <div className="-ml-3.5">
        <Chart
          options={options}
          series={[
            {
              name: "Sessions",
              data: chartData.map(item => item.y),
            },
          ]}
          type="bar"
          height={height}
        />
      </div>
    </div>
  );
}
