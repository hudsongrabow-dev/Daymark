const dailyQuotes = [
  'Small steps still move you forward.',
  'You do not need to do everything today—just the next right thing.',
  'Progress is built by showing up, even when the task is boring.',
  'Your future self will thank you for the effort you make now.',
  'Focus on what matters most, and the rest can wait.',
  'One clear action is better than a perfect plan.',
  'Momentum grows when you start before you feel ready.',
  'A calm routine can carry a powerful day.',
  'Keep your promises to yourself, even in small ways.',
  'You are capable of more than your stress says you are.',
  'Rest is productive when it helps you come back sharper.',
  'Your energy is a resource—protect it and use it wisely.',
  'The best way forward is often the next most honest step.',
  'You are building a life, not just checking off tasks.'
];

const state = {
  user: null,
  assignments: [],
  viewDate: new Date()
};

const colorMap = {
  coral: '#ee7e67',
  teal: '#3b9daa',
  yellow: '#eabf60',
  lavender: '#a995d8',
  mint: '#7fc8b0',
  sky: '#77b9e9',
  custom: '#ee7e67',
  test: '#ee7e67',
  quiz: '#77b9e9',
  homework: '#3b9daa',
  priority: '#eabf60',
  personal: '#a995d8'
};

const assignmentTypes = {
  test: 'Test',
  quiz: 'Quiz',
  homework: 'Homework',
  priority: 'Priority',
  personal: 'Personal'
};

const $ = (selector) => document.querySelector(selector);
const authView = $('#authView');
const plannerView = $('#plannerView');
const authForm = $('#authForm');
const assignmentDialog = $('#assignmentDialog');
const assignmentForm = $('#assignmentForm');

function setupAssignmentTypeField() {
  const colorField = $('.color-choice');
  if (!colorField) return;

  const label = document.createElement('label');
  label.className = 'type-choice';
  label.append('Type');

  const select = document.createElement('select');
  select.id = 'assignmentType';
  select.required = true;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a type';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.append(placeholder);

  Object.entries(assignmentTypes).forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  });

  label.append(select);
  colorField.replaceWith(label);
  $('#customColorWrapper')?.remove();
}

setupAssignmentTypeField();

function storageKey(email) { return `daymark:${email}`; }
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getStoredUser() { return JSON.parse(localStorage.getItem('daymark-session') || 'null'); }
function saveUserData() {
  if (!state.user) return;
  const saved = JSON.parse(localStorage.getItem(storageKey(state.user.email)) || '{}');
  localStorage.setItem(storageKey(state.user.email), JSON.stringify({ ...saved, assignments: state.assignments }));
  syncAssignmentsToServer();
}
function loadUserData() {
  const saved = JSON.parse(localStorage.getItem(storageKey(state.user.email)) || '{}');
  state.assignments = saved.assignments || [];
}
function formatDate(dateString, includeDay = true) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('en-US', { weekday: includeDay ? 'short' : undefined, month: 'short', day: 'numeric' });
}
function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const date = new Date(); date.setHours(hours, minutes);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2800);
}
function renderCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  $('#monthTitle').textContent = state.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const grid = $('#calendarGrid'); grid.innerHTML = '';
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - mondayOffset + 1;
    const cellDate = new Date(year, month, dayNumber);
    const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
    const assignment = state.assignments.find((item) => item.date === dateString && !item.completed);
    const isCurrent = dayNumber > 0 && dayNumber <= daysInMonth;
    const today = dateString === dateKey();
    const cell = document.createElement('button');
    cell.className = `calendar-day ${isCurrent ? 'current' : ''} ${today ? 'today' : ''} ${assignment ? 'has-assignment' : ''}`;
    cell.innerHTML = `<span class="day-label">${isCurrent ? dayNumber : dayNumber <= 0 ? previousMonthDays + dayNumber : dayNumber - daysInMonth}</span>${assignment ? `<span class="day-assignment">${assignment.title}</span>` : ''}`;
    if (assignment) {
      const accent = assignment.colorHex || colorMap[assignment.color] || colorMap.coral;
      cell.style.backgroundColor = `${accent}22`;
      cell.querySelector('.day-assignment').style.color = accent;
    }
    cell.addEventListener('click', () => { $('#assignmentDate').value = dateString; assignmentDialog.showModal(); });
    grid.appendChild(cell);
  }
}
function getSelectedAssignmentColor() {
  const type = $('#assignmentType').value;
  return { type, color: type, colorHex: colorMap[type] };
}

function renderAgenda() {
  const list = $('#assignmentList');
  const upcoming = [...state.assignments].filter((item) => !item.completed).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  list.innerHTML = upcoming.length ? upcoming.slice(0, 5).map((item) => {
    const accent = item.colorHex || colorMap[item.color] || colorMap.coral;
    const typeLabel = assignmentTypes[item.type] || '';
    return `<article class="assignment-item ${item.color === 'custom' ? 'custom' : item.color}" data-id="${item.id}" style="--assignment-accent: ${accent};"><span class="assignment-bar" style="background: ${accent};"></span><div><p class="assignment-title">${item.title}</p><p class="assignment-meta">${typeLabel ? `${typeLabel} · ` : ''}${formatDate(item.date)} · ${formatTime(item.time)} · remind ${item.reminder === 'daily' ? 'every day' : item.reminder === '0' ? 'at due time' : `${item.reminder}m before`}</p></div><button class="complete-button" aria-label="Complete ${item.title}">✓</button></article>`;
  }).join('') : '<p class="empty-state">Your agenda is open. Add something worth remembering.</p>';
  list.querySelectorAll('.complete-button').forEach((button) => button.addEventListener('click', () => completeAssignment(button.closest('.assignment-item').dataset.id)));
  const next = upcoming[0];
  $('#nextUpTitle').textContent = next ? next.title : 'Your day is clear.';
  $('#nextUpMeta').textContent = next ? `${formatDate(next.date)} at ${formatTime(next.time)}` : 'Add an assignment to see it here.';
  $('#nextUpTime').textContent = next ? formatTime(next.time) : '—';
  const weekStart = new Date(`${dateKey()}T12:00:00`);
  const weekCount = upcoming.filter((item) => {
    const dayOffset = (new Date(`${item.date}T12:00:00`) - weekStart) / 86400000;
    return dayOffset >= 0 && dayOffset < 7;
  }).length;
  $('#agendaDate').textContent = new Date(`${dateKey()}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  $('#progressLabel').textContent = `${weekCount} assignment${weekCount === 1 ? '' : 's'} due`;
  $('#progressBar').style.width = `${Math.min(100, weekCount * 24)}%`;
}
function completeAssignment(id) { state.assignments = state.assignments.map((item) => item.id === id ? { ...item, completed: true } : item); saveUserData(); renderAll(); showToast('Marked complete. Nice work.'); }
function getDailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayNumber = Math.floor((date - start) / 86400000);
  return dailyQuotes[dayNumber % dailyQuotes.length];
}

function renderDailyQuote() {
  const quote = getDailyQuote();
  $('#dailyQuote').textContent = `“${quote}”`;
}

function renderAll() { renderCalendar(); renderAgenda(); renderDailyQuote(); }
function syncAssignmentsToServer() {
  if (!state.user || state.user.email === 'guest') return;
  const apiUrl = location.protocol === 'https:' ? '/api/reminders/sync' : `https://${location.hostname}:4175/api/reminders/sync`;
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: state.user.email, assignments: state.assignments })
  }).catch((error) => console.error('Reminder sync failed:', error));
}

async function sendAssignmentNotification(assignment) {
  if (!state.user || state.user.email === 'guest') return;

  const dueDate = new Date(`${assignment.date}T${assignment.time}:00`);
  const reminderMinutes = assignment.reminder === 'daily' ? 0 : Number(assignment.reminder || 0);
  const scheduledDate = new Date(dueDate.getTime());

  if (reminderMinutes > 0) {
    scheduledDate.setMinutes(scheduledDate.getMinutes() - reminderMinutes);
  }

  if (scheduledDate.getTime() <= Date.now()) {
    return;
  }

  const payload = {
    email: state.user.email,
    title: assignment.title,
    date: assignment.date,
    time: assignment.time,
    reminder: assignment.reminder,
    quote: getDailyQuote(scheduledDate),
    sendAt: Math.floor(scheduledDate.getTime() / 1000)
  };

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Assignment email notification failed:', errorBody);
    }
  } catch (error) {
    console.error('Assignment email notification request failed:', error);
  }
}

function checkReminders() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  state.assignments.forEach((item) => {
    if (item.completed) return;
    const isDaily = item.reminder === 'daily';
    if (isDaily && today < item.date) return;
    const dueAt = new Date(`${isDaily ? today : item.date}T${item.time}`);
    const reminderAt = isDaily ? dueAt : new Date(dueAt.getTime() - Number(item.reminder) * 60000);
    const reminderKey = `${item.id}:${item.reminder}:${isDaily ? today : item.date}`;
    const alreadyNotified = localStorage.getItem(`daymark-notified:${reminderKey}`);
    if (now >= reminderAt && now < new Date(dueAt.getTime() + 60000) && !alreadyNotified) {
      localStorage.setItem(`daymark-notified:${reminderKey}`, '1');
      if ('Notification' in window && Notification.permission === 'granted') new Notification(`Daymark reminder: ${item.title}`);
      showToast(`Reminder: ${item.title}`);
    }
  });
}
function openPlanner(user) {
  state.user = user; loadUserData();
  syncAssignmentsToServer();
  const displayName = user.email === 'guest' ? 'Guest' : user.email.split('@')[0].split(/[._-]/)[0].replace(/^./, (letter) => letter.toUpperCase());
  $('#notificationButton').classList.toggle('hidden', user.email === 'guest');
  $('#assignmentReminder').closest('label').classList.toggle('hidden', user.email === 'guest');
  $('#firstName').textContent = displayName;
  $('#todayLabel').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  authView.classList.add('hidden'); plannerView.classList.remove('hidden'); renderAll();
}

function continueAsGuest() {
  const guestUser = { email: 'guest' };
  const guestData = JSON.parse(localStorage.getItem(storageKey('guest')) || '{}');
  localStorage.setItem(storageKey('guest'), JSON.stringify({
    ...guestData,
    assignments: guestData.assignments || []
  }));
  localStorage.setItem('daymark-session', JSON.stringify(guestUser));
  $('#authError').textContent = '';
  openPlanner(guestUser);
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = $('#emailInput').value.trim().toLowerCase();
  const password = $('#passwordInput').value;

  if (!email && !password) {
    continueAsGuest();
    return;
  }

  const normalizedEmail = email || 'guest';

  if (email && password && password.length < 6) {
    $('#authError').textContent = 'Passwords must be at least 6 characters.';
    return;
  }

  if (email) {
    const saved = JSON.parse(localStorage.getItem(storageKey(normalizedEmail)) || 'null');
    if (saved?.password && saved.password !== password) {
      $('#authError').textContent = 'That password does not match this account.';
      return;
    }
    localStorage.setItem(storageKey(normalizedEmail), JSON.stringify({ ...(saved || {}), password: password || saved?.password || '', assignments: saved?.assignments || [] }));
  }

  const user = { email: normalizedEmail };
  localStorage.setItem('daymark-session', JSON.stringify(user));
  $('#authError').textContent = '';
  openPlanner(user);
});

$('#guestAccessButton').addEventListener('click', continueAsGuest);
$('#profileButton').addEventListener('click', () => { localStorage.removeItem('daymark-session'); plannerView.classList.add('hidden'); authView.classList.remove('hidden'); authForm.reset(); });
$('#openAddButton').addEventListener('click', () => { $('#assignmentDate').value = dateKey(); assignmentDialog.showModal(); });
$('#closeAssignmentButton').addEventListener('click', () => assignmentDialog.close());
$('#navAdd').addEventListener('click', () => { $('#assignmentDate').value = dateKey(); assignmentDialog.showModal(); });
$('#prevMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
$('#navReminders').addEventListener('click', () => { const next = state.assignments.find((item) => !item.completed); showToast(next ? `Next reminder: ${next.title}` : 'No reminders yet.'); });
$('#notificationButton').addEventListener('click', async () => { if (!('Notification' in window)) { showToast('Browser reminders are not supported here.'); return; } const permission = await Notification.requestPermission(); if (permission === 'granted') { $('#notificationDot').classList.remove('hidden'); showToast('Browser reminders enabled.'); } else showToast('Reminders stay on inside your planner.'); });

assignmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const { type, color, colorHex } = getSelectedAssignmentColor();
  const newAssignment = {
    id: crypto.randomUUID(),
    title: $('#assignmentTitle').value.trim(),
    date: $('#assignmentDate').value,
    time: $('#assignmentTime').value,
    reminder: $('#assignmentReminder').value,
    type,
    color,
    colorHex,
    completed: false
  };

  state.assignments.push(newAssignment);
  saveUserData();
  await sendAssignmentNotification(newAssignment);

  assignmentDialog.close();
  assignmentForm.reset();
  $('#assignmentTime').value = '17:00';
  renderAll();
  showToast('Assignment saved to your agenda.');
});

const existingUser = getStoredUser();
if (existingUser) openPlanner(existingUser);
setInterval(checkReminders, 30000);
