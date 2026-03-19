import { Button, Result } from "antd";

export default function NotFound() {
  return (
    <main className="page-wrap">
      <Result
        extra={
          <Button href="/" size="large" type="primary">
            返回首页
          </Button>
        }
        status="404"
        subTitle="可能是项目或报告已经被删除，或者你还没有生成对应的数据。"
        title="页面不存在"
      />
    </main>
  );
}
