type AnswerRow = { activityTitle: string; status: string; createdAt: string; answers: Record<string, string>; formFields?: { id: string; label: string }[] };
export function registrationCsv(rows: AnswerRow[]) {
  const fields = new Map<string, { id: string; label: string }>();
  const originalFields = (row: AnswerRow) => row.formFields?.length ? row.formFields : Object.keys(row.answers).map(id => ({ id, label: id }));
  for (const row of rows) for (const field of originalFields(row)) fields.set(field.id + "\u0000" + field.label, field);
  const cell = (value: unknown) => { let text = String(value ?? ""); if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
  const status: Record<string, string> = { pending: "待确认", approved: "已通过", rejected: "已退回", cancelled: "已取消" };
  const lines = [
    ["活动", "报名状态", "报名时间", ...[...fields.values()].map(f => f.label)],
    ...rows.map(row => [row.activityTitle, status[row.status] || row.status, row.createdAt, ...[...fields].map(([key,field]) => originalFields(row).some(f => f.id + "\u0000" + f.label === key) ? row.answers[field.id] || "" : "")]),
  ];
  return "\ufeff" + lines.map(row => row.map(cell).join(",")).join("\r\n");
}
