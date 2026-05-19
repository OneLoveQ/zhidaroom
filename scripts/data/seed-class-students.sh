#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001/api}"

node --input-type=module <<'NODE'
const apiBase = process.env.API_BASE ?? 'http://127.0.0.1:3001/api';
const classes = [
  { grade: '一年级', name: '1班', prefix: '110' },
  { grade: '二年级', name: '3班', prefix: '230' },
  { grade: '四年级', name: '10班', prefix: '410' }
];

const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨'];
const given = ['子涵', '梓轩', '雨桐', '浩然', '欣怡', '明轩', '思远', '若曦', '宇航', '诗涵', '嘉懿', '一诺'];

async function request(path, init) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

function createStudents(classIndex, prefix) {
  return Array.from({ length: 60 }, (_, index) => {
    const no = String(index + 1).padStart(2, '0');
    const surname = surnames[(index + classIndex * 3) % surnames.length];
    const name = given[(index * 2 + classIndex) % given.length];
    return {
      studentNo: `${prefix}${no}`,
      name: `${surname}${name}`,
      cardCode: `C${String(index + 1).padStart(3, '0')}`
    };
  });
}

const existingClasses = await request('/classes');
for (const [index, item] of classes.entries()) {
  const matched = existingClasses.find((current) => current.grade === item.grade && current.name === item.name);
  const classView = matched ?? await request('/classes', {
    method: 'POST',
    body: JSON.stringify({ grade: item.grade, name: item.name })
  });
  const students = createStudents(index, item.prefix);
  const result = await request(`/classes/${classView.id}/students/import`, {
    method: 'POST',
    body: JSON.stringify({ students })
  });
  console.log(`${item.grade}${item.name}: 导入 ${result.importedCount} 人，失败 ${result.failedCount} 行`);
  if (result.errors?.length) {
    console.log(JSON.stringify(result.errors));
  }
}
NODE
