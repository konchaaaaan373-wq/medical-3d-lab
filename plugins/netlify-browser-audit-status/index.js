import { existsSync, readFileSync } from 'node:fs';

const safeJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

export const onPostBuild = ({ utils }) => {
  const reportPath = 'dist/browser-audit/report.json';
  const bootstrapPath = 'dist/browser-audit/bootstrap.json';
  const report = existsSync(reportPath) ? safeJson(reportPath) : null;
  const bootstrap = safeJson(bootstrapPath);

  if (!Array.isArray(report)) {
    const stages = bootstrap?.stages ?? [];
    const failed = stages.filter((stage) => !stage.ok).map((stage) => stage.name);
    utils.status.show({
      title: 'Browser-first candidate audit',
      summary: `Audit did not produce report.json${failed.length ? ` · failed: ${failed.join(', ')}` : ''}`,
      text: `Preview QA bootstrap: ${JSON.stringify(bootstrap ?? {}, null, 2)}`,
    });
    return;
  }

  const fatals = report.filter((row) => row.fatal);
  const issueCount = report.reduce((sum, row) => sum + (row.issues?.length ?? 0), 0);
  const lines = report.map((row) => {
    const label = `${row.scene ?? 'unknown'} / ${row.device ?? 'unknown'}`;
    if (row.fatal) return `- ${label}: FATAL — ${String(row.fatal).split('\n')[0]}`;
    const issues = row.issues ?? [];
    return `- ${label}: ${issues.length ? issues.join('; ') : 'OK'}`;
  });

  utils.status.show({
    title: 'Browser-first candidate audit',
    summary: `${report.length} runs · ${fatals.length} fatal · ${issueCount} issue(s)`,
    text: [
      ...lines,
      '',
      `[Open rendered audit](${process.env.DEPLOY_PRIME_URL ?? ''}/browser-audit/)`,
    ].join('\n'),
  });
};
