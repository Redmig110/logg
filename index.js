#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'habit-data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { records: [], streak: 0, lastCheckIn: null };
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { records: [], streak: 0, lastCheckIn: null };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getDateKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function checkStreak(data, now) {
  if (!data.lastCheckIn) {
    return 0;
  }

  const today = getDateKey(now);
  const lastDate = getDateKey(data.lastCheckIn);

  if (today === lastDate) {
    return data.streak;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday.getTime());

  if (lastDate === yesterdayKey) {
    return data.streak;
  }

  return 0;
}

function done() {
  const data = loadData();
  const now = Date.now();
  const today = getDateKey(now);

  const alreadyCheckedInToday = data.records.some(r => getDateKey(r) === today);

  if (alreadyCheckedInToday) {
    console.log('今天已经打卡过了！');
    const currentStreak = checkStreak(data, now);
    console.log(`当前连续打卡：${currentStreak} 天`);
    console.log(`累计打卡：${data.records.length} 天`);
    return;
  }

  const newStreak = checkStreak(data, now) + 1;

  data.records.push(now);
  data.streak = newStreak;
  data.lastCheckIn = now;

  saveData(data);

  console.log('✓ 打卡成功！');
  console.log(`当前连续打卡：${newStreak} 天`);
  console.log(`累计打卡：${data.records.length} 天`);
  console.log(`打卡时间：${new Date(now).toLocaleString()}`);
}

function status() {
  const data = loadData();
  const now = Date.now();

  const currentStreak = checkStreak(data, now);
  const today = getDateKey(now);
  const checkedInToday = data.records.some(r => getDateKey(r) === today);

  console.log('=== 打卡状态 ===');
  console.log(`今日打卡：${checkedInToday ? '✓ 已完成' : '✗ 未打卡'}`);
  console.log(`连续打卡：${currentStreak} 天`);
  console.log(`累计打卡：${data.records.length} 天`);

  if (data.lastCheckIn) {
    console.log(`上次打卡：${new Date(data.lastCheckIn).toLocaleString()}`);
  } else {
    console.log('上次打卡：暂无记录');
  }

  if (currentStreak !== data.streak) {
    console.log(`\n⚠ 检测到断签，连续打卡天数已重置`);
    data.streak = currentStreak;
    saveData(data);
  }
}

function help() {
  console.log('使用方法:');
  console.log('  habit done    - 完成今日打卡');
  console.log('  habit status  - 查看打卡状态');
  console.log('  habit help    - 显示帮助信息');
}

const command = process.argv[2];

switch (command) {
  case 'done':
    done();
    break;
  case 'status':
    status();
    break;
  case 'help':
  case undefined:
    help();
    break;
  default:
    console.log(`未知命令: ${command}`);
    help();
    process.exit(1);
}
