#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'habit-data.json');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

function c(text, styleNames) {
  const styles = styleNames.split('+');
  let prefix = '';
  for (const s of styles) {
    if (colors[s]) prefix += colors[s];
  }
  return prefix + text + colors.reset;
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function pad(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  return str + ' '.repeat(width - len);
}

function progressBar(current, target, width = 30) {
  const percent = Math.min(current / target, 1);
  const filled = Math.round(percent * width);
  const empty = width - filled;

  const filledBar = c('█'.repeat(filled), 'green');
  const emptyBar = c('░'.repeat(empty), 'dim');
  const percentText = c(`${Math.round(percent * 100)}%`, 'bold');

  return `${filledBar}${emptyBar} ${percentText}`;
}

function getMilestone(streak) {
  const milestones = [7, 14, 30, 60, 100, 365];
  for (const m of milestones) {
    if (streak < m) return m;
  }
  return streak + 365;
}

function divider(char = '─', width = 40) {
  return c(char.repeat(width), 'dim');
}

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

function header(title) {
  const width = 40;
  const padded = ` ${title} `;
  const sideLen = Math.floor((width - stripAnsi(padded).length) / 2);
  const side = '═'.repeat(Math.max(sideLen, 0));
  return `${c(side, 'cyan')}${c(padded, 'bold' + 'cyan')}${c(side, 'cyan')}`;
}

function done() {
  const data = loadData();
  const now = Date.now();
  const today = getDateKey(now);

  const alreadyCheckedInToday = data.records.some(r => getDateKey(r) === today);

  if (alreadyCheckedInToday) {
    console.log();
    console.log(header(' 打卡提醒 '));
    console.log();
    console.log(`${c('  ⚠', 'yellow')}  ${c('今天已经打卡过了！', 'bold' + 'yellow')}`);
    console.log();
    const currentStreak = checkStreak(data, now);
    const nextMilestone = getMilestone(currentStreak);
    console.log(`  ${pad(c('连续打卡', 'blue'), 12)} ${c(currentStreak + ' 天', 'bold' + 'green')}`);
    console.log(`  ${pad(c('累计打卡', 'blue'), 12)} ${c(data.records.length + ' 天', 'bold')}`);
    if (currentStreak > 0) {
      console.log();
      console.log(`  ${c('距离下一里程碑', 'magenta')} ${c(nextMilestone + ' 天', 'bold' + 'magenta')}`);
      console.log(`  ${progressBar(currentStreak, nextMilestone)}`);
    }
    console.log();
    console.log(divider());
    console.log();
    return;
  }

  const newStreak = checkStreak(data, now) + 1;

  data.records.push(now);
  data.streak = newStreak;
  data.lastCheckIn = now;

  saveData(data);

  const nextMilestone = getMilestone(newStreak);
  const isMilestone = [7, 14, 30, 60, 100, 365].includes(newStreak);

  console.log();
  console.log(header(' 打卡成功 '));
  console.log();
  console.log(`${c('  ✓', 'green')}  ${c('今日打卡完成！', 'bold' + 'green')}`);
  if (isMilestone) {
    console.log();
    console.log(`  ${c('🎉 恭喜达成 ' + newStreak + ' 天里程碑！', 'bold' + 'magenta')}`);
  }
  console.log();
  console.log(`  ${pad(c('连续打卡', 'blue'), 12)} ${c(newStreak + ' 天', 'bold' + 'green')}`);
  console.log(`  ${pad(c('累计打卡', 'blue'), 12)} ${c(data.records.length + ' 天', 'bold')}`);
  console.log(`  ${pad(c('打卡时间', 'blue'), 12)} ${c(new Date(now).toLocaleString(), 'dim')}`);
  console.log();
  console.log(`  ${c('距离下一里程碑', 'magenta')} ${c(nextMilestone + ' 天', 'bold' + 'magenta')}`);
  console.log(`  ${progressBar(newStreak, nextMilestone)}`);
  console.log();
  console.log(divider());
  console.log();
}

function status() {
  const data = loadData();
  const now = Date.now();

  const currentStreak = checkStreak(data, now);
  const today = getDateKey(now);
  const checkedInToday = data.records.some(r => getDateKey(r) === today);
  const nextMilestone = getMilestone(currentStreak);

  const streakReset = currentStreak !== data.streak;
  if (streakReset) {
    data.streak = currentStreak;
    saveData(data);
  }

  console.log();
  console.log(header(' 打卡状态 '));
  console.log();

  const todayStatus = checkedInToday
    ? `${c('  ✓', 'green')} ${c('已完成', 'bold' + 'green')}`
    : `${c('  ✗', 'red')} ${c('未打卡', 'bold' + 'red')}`;
  console.log(`  ${pad(c('今日打卡', 'blue'), 12)} ${todayStatus}`);

  const streakColor = currentStreak >= 30 ? 'magenta' : currentStreak >= 7 ? 'green' : currentStreak > 0 ? 'yellow' : 'dim';
  console.log(`  ${pad(c('连续打卡', 'blue'), 12)} ${c(currentStreak + ' 天', 'bold' + streakColor)}`);
  console.log(`  ${pad(c('累计打卡', 'blue'), 12)} ${c(data.records.length + ' 天', 'bold')}`);

  if (data.lastCheckIn) {
    console.log(`  ${pad(c('上次打卡', 'blue'), 12)} ${c(new Date(data.lastCheckIn).toLocaleString(), 'dim')}`);
  } else {
    console.log(`  ${pad(c('上次打卡', 'blue'), 12)} ${c('暂无记录', 'dim')}`);
  }

  if (currentStreak > 0) {
    console.log();
    console.log(`  ${c('距离下一里程碑', 'magenta')} ${c(nextMilestone + ' 天', 'bold' + 'magenta')}`);
    console.log(`  ${progressBar(currentStreak, nextMilestone)}`);
  }

  if (streakReset) {
    console.log();
    console.log(`  ${c('⚠', 'yellow')} ${c('检测到断签，连续打卡天数已重置', 'bold' + 'yellow')}`);
  }

  console.log();
  console.log(divider());
  console.log();
}

function help() {
  console.log();
  console.log(header(' 习惯打卡器 '));
  console.log();
  console.log(`  ${c('命令:', 'bold' + 'cyan')}`);
  console.log();
  console.log(`    ${c('habit done', 'green')}    ${c('- 完成今日打卡', 'dim')}`);
  console.log(`    ${c('habit status', 'green')}  ${c('- 查看打卡状态', 'dim')}`);
  console.log(`    ${c('habit help', 'green')}    ${c('- 显示帮助信息', 'dim')}`);
  console.log();
  console.log(`  ${c('提示:', 'bold' + 'yellow')}`);
  console.log();
  console.log(`    ${c('• 每天只能打卡一次', 'dim')}`);
  console.log(`    ${c('• 超过一天未打卡将断签', 'dim')}`);
  console.log(`    ${c('• 达成 7/14/30/60/100/365 天会有里程碑提示', 'dim')}`);
  console.log();
  console.log(divider());
  console.log();
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
    console.log();
    console.log(`  ${c('✗', 'red')} ${c('未知命令:', 'bold' + 'red')} ${c(command, 'yellow')}`);
    console.log();
    help();
    process.exit(1);
}
