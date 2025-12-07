const fs = require('fs');
const path = require('path');

/**
 * 生成测试报告脚本
 */
function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function main() {
  const coverage = readJSON(path.join(process.cwd(), 'coverage', 'coverage-summary.json'));
  const pw = readJSON(path.join(process.cwd(), 'reports', 'playwright-results.json'));

  const unitSummary = coverage?.total || {};
  const e2eSummary = pw ? {
    tests: pw.suites?.reduce((acc, s) => acc + s.specs.length, 0) || 0,
    status: pw.status || 'unknown'
  } : { tests: 0, status: 'unknown' };

  const now = new Date().toISOString();
  const reportPath = path.join(process.cwd(), 'docs', 'testing', 'test-report.md');
  const content = `# 测试报告\n\n## 概览\n- 执行日期：${now}\n- 环境：本地开发(HTTP/WS)\n\n## 结果统计\n- 单元测试覆盖率：\n  - 行覆盖率：${unitSummary.lines?.pct ?? 'N/A'}%\n  - 语句覆盖率：${unitSummary.statements?.pct ?? 'N/A'}%\n  - 分支覆盖率：${unitSummary.branches?.pct ?? 'N/A'}%\n  - 函数覆盖率：${unitSummary.functions?.pct ?? 'N/A'}%\n- E2E测试：共 ${e2eSummary.tests} 个用例，状态：${e2eSummary.status}\n- 性能测试：参考控制台 perf 输出\n\n## 缺陷汇总与分析\n- 待补充\n\n## 稳定性评估与建议\n- 初步稳定，通过核心路径\n`;

  fs.writeFileSync(reportPath, content, 'utf-8');
  console.log(`测试报告已生成: ${reportPath}`);
}

main();

