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
  viewDate: new Date(),
  editingAssignmentId: null
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
const signUpForm = $('#signUpForm');
const loginForm = $('#loginForm');
const assignmentDialog = $('#assignmentDialog');
const assignmentForm = $('#assignmentForm');

function setupFinishedView() {
  const finishedButton = document.createElement('button');
  finishedButton.type = 'button';
  finishedButton.className = 'nav-item';
  finishedButton.id = 'navFinished';
  finishedButton.innerHTML = '<span aria-hidden="true">✓</span>Finished';
  $('#navReminders').insertAdjacentElement('afterend', finishedButton);

  const dialog = document.createElement('dialog');
  dialog.id = 'finishedDialog';
  dialog.className = 'assignment-dialog finished-dialog';
  dialog.setAttribute('aria-labelledby', 'finishedTitle');
  dialog.innerHTML = '<section class="dialog-card"><button class="close-button" id="closeFinishedButton" type="button" aria-label="Close">×</button><p class="section-kicker">COMPLETED</p><h2 id="finishedTitle">Recently finished</h2><div class="finished-list" id="finishedList"></div></section>';
  document.body.append(dialog);

  finishedButton.addEventListener('click', () => {
    renderFinishedAssignments();
    dialog.showModal();
  });
  $('#closeFinishedButton').addEventListener('click', () => dialog.close());
}

setupFinishedView();

function setupAuthForms() {
  const authPanels = $('.auth-panels');
  const showForm = (form) => {
    authPanels.classList.add('hidden');
    signUpForm.classList.toggle('hidden', form !== signUpForm);
    loginForm.classList.toggle('hidden', form !== loginForm);
    $('#authError').textContent = '';
    form.querySelector('input').focus();
  };

  $('#showSignUpButton').addEventListener('click', () => showForm(signUpForm));
  $('#showLoginButton').addEventListener('click', () => showForm(loginForm));
  document.querySelectorAll('[data-auth-back]').forEach((button) => {
    button.addEventListener('click', () => {
      signUpForm.classList.add('hidden');
      loginForm.classList.add('hidden');
      authPanels.classList.remove('hidden');
      $('#authError').textContent = '';
    });
  });
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $(`#${button.dataset.passwordTarget}`);
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      button.textContent = showPassword ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${showPassword ? 'Hide' : 'Show'} password`);
    });
  });
}

setupAuthForms();

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
function getSupabaseClient() {
  if (!window.daymarkSupabase) {
    throw new Error('Supabase is not available. Use guest mode or open the hosted website.');
  }
  return window.daymarkSupabase;
}
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getStoredUser() { return JSON.parse(localStorage.getItem('daymark-session') || 'null'); }
function saveUserData() {
  if (!state.user) return;
  const saved = JSON.parse(localStorage.getItem(storageKey(state.user.email)) || '{}');
  if (state.user.id) {
    delete saved.password;
    localStorage.setItem(storageKey(state.user.email), JSON.stringify({ ...saved, assignments: state.assignments }));
    const rows = state.assignments.map((assignment) => ({
      id: assignment.id,
      user_id: state.user.id,
      title: assignment.title,
      due_date: assignment.date,
      due_time: `${assignment.time}:00`,
      reminder: String(assignment.reminder ?? '60'),
      type: assignment.type || null,
      color: assignment.color || null,
      color_hex: assignment.colorHex || null,
      completed: Boolean(assignment.completed),
      completed_at: assignment.completedAt || null
    }));
    return getSupabaseClient().from('assignments').upsert(rows, { onConflict: 'user_id,id' }).then(({ error }) => {
      if (error) throw error;
    });
  }
  localStorage.setItem(storageKey(state.user.email), JSON.stringify({ ...saved, assignments: state.assignments }));
}
function loadUserData() {
  const saved = JSON.parse(localStorage.getItem(storageKey(state.user.email)) || '{}');
  state.assignments = saved.assignments || [];
}
async function loadCloudAssignments(user) {
  const supabase = getSupabaseClient();
  const key = storageKey(user.email);
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  const localAssignments = Array.isArray(saved.assignments) ? saved.assignments : [];
  const { data: cloudResult, error: loadError } = await supabase.functions.invoke('get-assignments', { method: 'GET' });
  if (loadError) throw loadError;
  if (!Array.isArray(cloudResult?.assignments)) {
    throw new Error('The assignments function returned an invalid response.');
  }

  const cloudRows = cloudResult.assignments;
  const cloudIds = new Set(cloudRows.map((assignment) => assignment.id));
  const assignmentsToMigrate = localAssignments.filter((assignment) => !cloudIds.has(assignment.id));
  if (assignmentsToMigrate.length) {
    const rows = assignmentsToMigrate.map((assignment) => ({
      id: assignment.id,
      user_id: user.id,
      title: assignment.title,
      due_date: assignment.date,
      due_time: `${assignment.time}:00`,
      reminder: String(assignment.reminder ?? '60'),
      type: assignment.type || null,
      color: assignment.color || null,
      color_hex: assignment.colorHex || null,
      completed: Boolean(assignment.completed),
      completed_at: assignment.completedAt || null
    }));
    const { error } = await supabase.from('assignments').upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }

  const result = assignmentsToMigrate.length
    ? await supabase.functions.invoke('get-assignments', { method: 'GET' })
    : { data: cloudResult, error: null };
  if (result.error) throw result.error;
  if (!Array.isArray(result.data?.assignments)) {
    throw new Error('The assignments function returned an invalid response.');
  }

  state.assignments = result.data.assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.name,
    date: assignment.dueDate,
    time: assignment.dueTime,
    reminder: assignment.reminder,
    type: assignment.type,
    color: assignment.color,
    colorHex: assignment.colorHex,
    completed: assignment.completed,
    ...(assignment.completedAt ? { completedAt: assignment.completedAt } : {})
  }));
  delete saved.password;
  localStorage.setItem(key, JSON.stringify({ ...saved, assignments: state.assignments }));
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

function setAssignmentDialogMode(editing) {
  $('#assignmentDialog .section-kicker').textContent = editing ? 'EDIT ENTRY' : 'NEW ENTRY';
  $('#assignmentDialog h2').textContent = editing ? 'Update your plan.' : 'Make it visible.';
  $('#assignmentForm button[type="submit"]').textContent = editing ? 'Save changes' : 'Save assignment';
}

function openNewAssignment(date = dateKey()) {
  state.editingAssignmentId = null;
  assignmentForm.reset();
  $('#assignmentDate').value = date;
  $('#assignmentTime').value = '17:00';
  setAssignmentDialogMode(false);
  assignmentDialog.showModal();
}

function openEditAssignment(id) {
  const assignment = state.assignments.find((item) => item.id === id);
  if (!assignment) return;

  state.editingAssignmentId = id;
  $('#assignmentTitle').value = assignment.title;
  $('#assignmentDate').value = assignment.date;
  $('#assignmentTime').value = assignment.time;
  $('#assignmentReminder').value = assignment.reminder || '60';
  $('#assignmentType').value = assignmentTypes[assignment.type] ? assignment.type : 'homework';
  setAssignmentDialogMode(true);
  assignmentDialog.showModal();
}

function renderAgenda() {
  const list = $('#assignmentList');
  const upcoming = [...state.assignments].filter((item) => !item.completed).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  list.innerHTML = upcoming.length ? upcoming.slice(0, 5).map((item) => {
    const accent = item.colorHex || colorMap[item.color] || colorMap.coral;
    const typeLabel = assignmentTypes[item.type] || '';
    return `<article class="assignment-item ${item.color === 'custom' ? 'custom' : item.color}" data-id="${item.id}" style="--assignment-accent: ${accent};"><span class="assignment-bar" style="background: ${accent};"></span><div><p class="assignment-title">${item.title}</p><p class="assignment-meta">${typeLabel ? `${typeLabel} · ` : ''}${formatDate(item.date)} · ${formatTime(item.time)} · remind ${item.reminder === 'daily' ? 'every day' : item.reminder === '0' ? 'at due time' : `${item.reminder}m before`}</p></div><div class="assignment-actions"><button class="edit-button" type="button" aria-label="Edit ${item.title}">Edit</button><button class="complete-button" type="button" aria-label="Complete ${item.title}">✓</button></div></article>`;
  }).join('') : '<p class="empty-state">Your agenda is open. Add something worth remembering.</p>';
  list.querySelectorAll('.complete-button').forEach((button) => button.addEventListener('click', () => completeAssignment(button.closest('.assignment-item').dataset.id)));
  list.querySelectorAll('.edit-button').forEach((button) => button.addEventListener('click', () => openEditAssignment(button.closest('.assignment-item').dataset.id)));
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
async function completeAssignment(id) {
  const completedAt = new Date().toISOString();
  state.assignments = state.assignments.map((item) => item.id === id ? { ...item, completed: true, completedAt } : item);
  renderAll();
  try {
    await saveUserData();
    showToast('Marked complete. Nice work.');
  } catch (error) {
    showToast(`Could not sync assignment: ${error.message}`);
  }
}
async function reAddAssignment(id) {
  state.assignments = state.assignments.map((item) => {
    if (item.id !== id) return item;
    const { completedAt, ...assignment } = item;
    return { ...assignment, completed: false };
  });
  renderAll();
  renderFinishedAssignments();
  try {
    await saveUserData();
    showToast('Added back to your agenda.');
  } catch (error) {
    showToast(`Could not sync assignment: ${error.message}`);
  }
}
function renderFinishedAssignments() {
  const list = $('#finishedList');
  const completed = state.assignments.filter((item) => item.completed).sort((first, second) => {
    const firstDate = first.completedAt ? Date.parse(first.completedAt) : null;
    const secondDate = second.completedAt ? Date.parse(second.completedAt) : null;
    if (firstDate !== null && secondDate === null) return -1;
    if (firstDate === null && secondDate !== null) return 1;
    if (firstDate !== null && secondDate !== null) return secondDate - firstDate;
    return String(second.date).localeCompare(String(first.date));
  });
  list.replaceChildren();

  if (!completed.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No finished assignments yet.';
    list.append(emptyState);
    return;
  }

  completed.forEach((item) => {
    const accent = item.colorHex || colorMap[item.color] || colorMap.coral;
    const article = document.createElement('article');
    article.className = 'finished-item';
    article.style.setProperty('--assignment-accent', accent);

    const bar = document.createElement('span');
    bar.className = 'finished-bar';
    const details = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'assignment-title';
    title.textContent = item.title;
    const meta = document.createElement('p');
    meta.className = 'assignment-meta';
    const typeLabel = assignmentTypes[item.type];
    const completedDate = item.completedAt ? new Date(item.completedAt) : null;
    const completedLabel = completedDate && !Number.isNaN(completedDate.getTime())
      ? completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Previously completed';
    meta.textContent = `${typeLabel ? `${typeLabel} · ` : ''}Due ${formatDate(item.date)} · Finished ${completedLabel}`;
    const reAddButton = document.createElement('button');
    reAddButton.type = 'button';
    reAddButton.className = 'finished-readd-button';
    reAddButton.textContent = 'Re-add';
    reAddButton.setAttribute('aria-label', `Re-add ${item.title} to your agenda`);
    reAddButton.addEventListener('click', () => reAddAssignment(item.id));

    details.append(title, meta);
    article.append(bar, details, reAddButton);
    list.append(article);
  });
}
function getDailyQuote(date = new Date()) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const currentDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = Math.floor((currentDay - start) / 86400000);
  return dailyQuotes[dayNumber % dailyQuotes.length];
}

function renderDailyQuote() {
  const quote = getDailyQuote();
  $('#dailyQuote').textContent = `“${quote}”`;
}

function scheduleDailyQuoteRefresh() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  setTimeout(() => {
    renderDailyQuote();
    scheduleDailyQuoteRefresh();
  }, tomorrow.getTime() - now.getTime());
}

function renderAll() { renderCalendar(); renderAgenda(); renderDailyQuote(); }
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
async function openPlanner(user) {
  if (user.email === 'guest') {
    state.user = user;
    loadUserData();
  } else {
    await loadCloudAssignments(user);
    state.user = user;
  }
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
  void openPlanner(guestUser);
}

async function handleAccountSubmit(event, mode) {
  event.preventDefault();
  const prefix = mode === 'signup' ? 'signUp' : 'login';
  const email = $(`#${prefix}Email`).value.trim().toLowerCase();
  const password = $(`#${prefix}Password`).value;

  if (password.length < 6) {
    $('#authError').textContent = 'Passwords must be at least 6 characters.';
    return;
  }

  $('#authError').textContent = '';
  try {
    const supabase = getSupabaseClient();
    const result = mode === 'signup'
      ? await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;

    if (mode === 'signup' && !result.data.session) {
      const saved = JSON.parse(localStorage.getItem(storageKey(email)) || '{}');
      delete saved.password;
      localStorage.setItem(storageKey(email), JSON.stringify(saved));
      $('#authError').textContent = 'Check your email to confirm your account, then log in.';
      return;
    }
    if (!result.data.user) throw new Error('No signed-in user was returned.');

    const saved = JSON.parse(localStorage.getItem(storageKey(email)) || '{}');
    delete saved.password;
    localStorage.setItem(storageKey(email), JSON.stringify(saved));
    localStorage.removeItem('daymark-session');
    await openPlanner(result.data.user);
  } catch (error) {
    $('#authError').textContent = error.message;
  }
}

signUpForm.addEventListener('submit', (event) => handleAccountSubmit(event, 'signup'));
loginForm.addEventListener('submit', (event) => handleAccountSubmit(event, 'login'));

$('#guestAccessButton').addEventListener('click', continueAsGuest);
async function returnToAuth() {
  if (state.user?.id) {
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    } catch (error) {
      showToast(`Could not sign out: ${error.message}`);
      return;
    }
  }
  if (assignmentDialog.open) assignmentDialog.close();
  localStorage.removeItem('daymark-session');
  state.user = null;
  state.assignments = [];
  plannerView.classList.add('hidden');
  authView.classList.remove('hidden');
  signUpForm.reset();
  loginForm.reset();
  $('.auth-panels').classList.remove('hidden');
  signUpForm.classList.add('hidden');
  loginForm.classList.add('hidden');
  $('#authError').textContent = '';
  window.scrollTo(0, 0);
}
$('#profileButton').addEventListener('click', () => returnToAuth());
$('#signOutButton').addEventListener('click', () => returnToAuth());
$('#openAddButton').addEventListener('click', () => openNewAssignment());
$('#closeAssignmentButton').addEventListener('click', () => assignmentDialog.close());
$('#navAdd').addEventListener('click', () => openNewAssignment());
assignmentDialog.addEventListener('close', () => {
  state.editingAssignmentId = null;
  assignmentForm.reset();
  $('#assignmentTime').value = '17:00';
  setAssignmentDialogMode(false);
});
$('#prevMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
$('#navReminders').addEventListener('click', () => { const next = state.assignments.find((item) => !item.completed); showToast(next ? `Next reminder: ${next.title}` : 'No reminders yet.'); });
$('#notificationButton').addEventListener('click', async () => { if (!('Notification' in window)) { showToast('Browser reminders are not supported here.'); return; } const permission = await Notification.requestPermission(); if (permission === 'granted') { $('#notificationDot').classList.remove('hidden'); showToast('Browser reminders enabled.'); } else showToast('Reminders stay on inside your planner.'); });

assignmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const { type, color, colorHex } = getSelectedAssignmentColor();
  const editing = Boolean(state.editingAssignmentId);
  const newAssignment = { id: state.editingAssignmentId || crypto.randomUUID(), title: $('#assignmentTitle').value.trim(), date: $('#assignmentDate').value, time: $('#assignmentTime').value, reminder: $('#assignmentReminder').value, type, color, colorHex, completed: false };
  if (editing) {
    state.assignments = state.assignments.map((item) => item.id === state.editingAssignmentId ? { ...item, ...newAssignment } : item);
  } else {
    state.assignments.push(newAssignment);
  }
  let syncError = null;
  try {
    await saveUserData();
  } catch (error) {
    syncError = error;
  }
  assignmentDialog.close();
  renderAll();
  showToast(syncError
    ? `Saved locally but could not sync: ${syncError.message}`
    : editing ? 'Assignment updated.' : 'Assignment saved to your agenda.');
});

const existingUser = getStoredUser();
if (window.daymarkSupabase) {
  window.daymarkSupabase.auth.getUser().then(({ data, error }) => {
    if (error) throw error;
    if (data.user) {
      localStorage.removeItem('daymark-session');
      return openPlanner(data.user);
    }
    if (existingUser?.email === 'guest') return openPlanner(existingUser);
    localStorage.removeItem('daymark-session');
  }).catch((error) => {
    $('#authError').textContent = `Could not check your session: ${error.message}`;
  });
} else if (existingUser?.email === 'guest') {
  void openPlanner(existingUser);
} else {
  localStorage.removeItem('daymark-session');
}
scheduleDailyQuoteRefresh();
setInterval(checkReminders, 30000);
