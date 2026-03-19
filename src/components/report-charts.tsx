"use client";

import { useEffect, useRef } from "react";

import { Card, Col, Empty, Row } from "antd";

import type { StructuredDailySummary } from "@/lib/types";

type ReportChartsProps = {
  dailySummaries: StructuredDailySummary[];
  topAuthors: Array<{
    name: string;
    commits: number;
  }>;
};

type ChartInstance = {
  setOption: (option: unknown) => void;
  resize: () => void;
  dispose: () => void;
};

export function ReportCharts({ dailySummaries, topAuthors }: ReportChartsProps) {
  const trendRef = useRef<HTMLDivElement | null>(null);
  const authorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!trendRef.current || !authorRef.current) {
      return;
    }

    let disposed = false;
    let resizeHandler: (() => void) | undefined;
    let trendChart: ChartInstance | undefined;
    let authorChart: ChartInstance | undefined;

    void import("echarts").then((echarts) => {
      if (disposed || !trendRef.current || !authorRef.current) {
        return;
      }

      trendChart = echarts.init(trendRef.current);
      authorChart = echarts.init(authorRef.current);

      const dailyData = [...dailySummaries].reverse();
      trendChart.setOption({
        backgroundColor: "transparent",
        color: ["#1d5fd0", "#f08c3a", "#7a8ca8"],
        grid: {
          left: 40,
          right: 24,
          top: 36,
          bottom: 36,
        },
        legend: {
          top: 0,
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: dailyData.map((item) => item.date.slice(5)),
        },
        yAxis: [
          {
            type: "value",
            name: "提交",
          },
          {
            type: "value",
            name: "代码行",
          },
        ],
        series: [
          {
            name: "提交数",
            type: "bar",
            barMaxWidth: 28,
            data: dailyData.map((item) => item.commitCount),
          },
          {
            name: "新增行数",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            data: dailyData.map((item) => item.additions),
          },
          {
            name: "删除行数",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            data: dailyData.map((item) => item.deletions),
          },
        ],
      });

      authorChart.setOption({
        backgroundColor: "transparent",
        color: ["#1d5fd0"],
        grid: {
          left: 90,
          right: 24,
          top: 20,
          bottom: 20,
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "value",
        },
        yAxis: {
          type: "category",
          data: topAuthors.map((item) => item.name).reverse(),
        },
        series: [
          {
            name: "提交数",
            type: "bar",
            barMaxWidth: 22,
            data: topAuthors.map((item) => item.commits).reverse(),
            label: {
              show: true,
              position: "right",
            },
          },
        ],
      });

      resizeHandler = () => {
        trendChart?.resize();
        authorChart?.resize();
      };

      window.addEventListener("resize", resizeHandler);
    });

    return () => {
      disposed = true;
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      trendChart?.dispose();
      authorChart?.dispose();
    };
  }, [dailySummaries, topAuthors]);

  if (dailySummaries.length === 0 && topAuthors.length === 0) {
    return (
      <Card title="图表概览">
        <Empty description="当前没有可视化数据。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={14}>
        <Card title="提交趋势">
          <div ref={trendRef} style={{ height: 320, width: "100%" }} />
        </Card>
      </Col>
      <Col xs={24} xl={10}>
        <Card title="作者分布">
          <div ref={authorRef} style={{ height: 320, width: "100%" }} />
        </Card>
      </Col>
    </Row>
  );
}
