from pathlib import Path
import re

import openpyxl


def sql_quote(value):
    if value is None:
        return "NULL"
    text = str(value).strip()
    if text == "":
        return "NULL"
    return "'" + text.replace("\\", "\\\\").replace("'", "''") + "'"


def parse_expert(label):
    label = str(label or "").strip()
    match = re.search(r"（([^）]+)）|\(([^)]+)\)", label)
    username = ""
    if match:
        username = (match.group(1) or match.group(2) or "").strip()
    name = re.sub(r"（[^）]+）|\([^)]+\)", "", label).strip()
    return name, username


def main():
    source_dir = Path(
        r"C:\Users\WANGc\Documents\xwechat_files\wxid_ov747j8jifo432_e829\msg\file\2026-08"
    )
    source_file = next(source_dir.glob("*0820*.xlsx"))
    out_file = Path("database") / "fill_expert_reviews_0820.sql"

    ws = openpyxl.load_workbook(source_file, data_only=True).active
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        project_title = str(row[0] or "").strip()
        if not project_title:
            continue
        for idx in range(3):
            expert_label = str(row[1 + idx] or "").strip()
            review_comment = str(row[4 + idx] or "").strip()
            if not expert_label and not review_comment:
                continue
            expert_name, expert_username = parse_expert(expert_label)
            rows.append(
                {
                    "project_title": project_title,
                    "expert_label": expert_label,
                    "expert_name": expert_name,
                    "expert_username": expert_username,
                    "review_comment": review_comment,
                    "review_score": 95,
                }
            )

    values = []
    for row in rows:
        values.append(
            "("
            + ", ".join(
                [
                    sql_quote(row["project_title"]),
                    sql_quote(row["expert_label"]),
                    sql_quote(row["expert_name"]),
                    sql_quote(row["expert_username"]),
                    sql_quote(row["review_comment"]),
                    str(row["review_score"]),
                ]
            )
            + ")"
        )

    values_sql = ",\n".join(values)
    sql = f"""-- 补充专家评审项目清单0820
-- 来源文件：{source_file}
-- 用途：给已入库项目补充专家分配、专家评审意见和专家评分。
-- 注意：执行前请先看两个检查 SELECT 的结果；如果有未匹配项目/专家，先修正名称或用户名。

START TRANSACTION;

CREATE TEMPORARY TABLE tmp_project_reviews_0820 (
  project_title VARCHAR(500) NOT NULL,
  expert_label VARCHAR(200) NOT NULL,
  expert_name VARCHAR(100) NOT NULL,
  expert_username VARCHAR(100) DEFAULT NULL,
  review_comment TEXT,
  review_score DECIMAL(5,2) NOT NULL DEFAULT 95
) ENGINE=Memory DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_project_reviews_0820
(project_title, expert_label, expert_name, expert_username, review_comment, review_score)
VALUES
{values_sql};

-- 检查 1：项目或专家匹配不上时，这里会有结果。
SELECT
  t.project_title,
  t.expert_label,
  CASE WHEN p.id IS NULL THEN '项目未匹配' ELSE '' END AS project_issue,
  CASE WHEN u.id IS NULL THEN '专家未匹配' ELSE '' END AS expert_issue
FROM tmp_project_reviews_0820 t
LEFT JOIN `Project` p ON p.title = t.project_title
LEFT JOIN `User` u
  ON u.role = 'reviewer'
 AND (
   u.username = t.expert_username
   OR u.name = t.expert_name
   OR u.email = t.expert_username
 )
WHERE p.id IS NULL OR u.id IS NULL;

-- 检查 2：项目名称重名时，这里会有结果。重名项目建议先人工确认 project_code 再执行。
SELECT p.title, COUNT(*) AS project_count
FROM `Project` p
JOIN tmp_project_reviews_0820 t ON t.project_title = p.title
GROUP BY p.title
HAVING COUNT(*) > 1;

SET @admin_id = (
  SELECT id
  FROM `User`
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1
);

-- 已经分配过的专家：直接补/覆盖评审意见和评分。
UPDATE `ExpertAssignment` ea
JOIN `Project` p ON p.id = ea.project_id
JOIN `User` u ON u.id = ea.expert_id
JOIN tmp_project_reviews_0820 t
  ON t.project_title = p.title
 AND (
   u.username = t.expert_username
   OR u.name = t.expert_name
   OR u.email = t.expert_username
 )
SET
  ea.comment = t.review_comment,
  ea.score = t.review_score,
  ea.status = 'accepted';

-- 尚未分配的专家：新增分配记录，并写入评审意见和评分。
INSERT INTO `ExpertAssignment`
(id, project_id, expert_id, assigned_by, assigned_at, status, comment, score, created_at)
SELECT
  UUID(),
  p.id,
  u.id,
  @admin_id,
  NOW(),
  'accepted',
  t.review_comment,
  t.review_score,
  NOW()
FROM tmp_project_reviews_0820 t
JOIN `Project` p ON p.title = t.project_title
JOIN `User` u
  ON u.role = 'reviewer'
 AND (
   u.username = t.expert_username
   OR u.name = t.expert_name
   OR u.email = t.expert_username
 )
LEFT JOIN `ExpertAssignment` ea
  ON ea.project_id = p.id
 AND ea.expert_id = u.id
WHERE ea.id IS NULL;

COMMIT;
"""

    out_file.write_text(sql, encoding="utf-8")
    print(f"written: {out_file}")
    print(f"rows: {len(rows)}")


if __name__ == "__main__":
    main()
