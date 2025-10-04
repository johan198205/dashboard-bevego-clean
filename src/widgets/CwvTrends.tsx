"use client";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { CwvTrendPoint } from '@/lib/types';

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type CwvTrendsProps = {
  data: CwvTrendPoint[];
  className?: string;
};

export default function CwvTrends({ data, className }: CwvTrendsProps) {
  const options: ApexOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
    },
    colors: ["#E01E26", "#F87171", "#FCA5A5"],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    grid: {
      strokeDashArray: 5,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      marker: {
        show: true,
      },
    },
    xaxis: {
      type: "datetime",
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: [
      {
        title: {
          text: "LCP (ms)",
          style: {
            color: "#E01E26",
          },
        },
        labels: {
          style: {
            colors: "#E01E26",
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "INP (ms)",
          style: {
            color: "#F87171",
          },
        },
        labels: {
          style: {
            colors: "#F87171",
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "CLS",
          style: {
            color: "#FCA5A5",
          },
        },
        labels: {
          style: {
            colors: "#FCA5A5",
          },
        },
        min: 0,
        max: 0.3,
      },
    ],
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontFamily: "inherit",
      fontWeight: 500,
      fontSize: "14px",
      markers: {
        size: 9,
        shape: "circle",
      },
    },
  };

  const series = [
    {
      name: "LCP",
      type: "line",
      data: data.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.lcp
      })),
    },
    {
      name: "INP", 
      type: "line",
      data: data.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.inp
      })),
    },
    {
      name: "CLS",
      type: "line", 
      data: data.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.cls
      })),
    },
  ];

  return (
    <div className={`card ${className}`}>
      <h3 className="title mb-4">Trender senaste 40 veckor</h3>
      <div className="-ml-4 -mr-5">
        <Chart
          options={options}
          series={series}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
}
