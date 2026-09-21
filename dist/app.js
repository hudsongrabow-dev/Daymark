const state = {
  user: null,
  assignments: [],
  viewDate: new Date(2026, 8, 14)
};

const $ = (selector) => document.querySelector(selector);
const authView = $('#authView');
const plannerView = $('#plannerView');
const authForm = $('#authForm');
const assignmentDialog = $('#assignmentDialog');
const assignmentForm = $('#assignmentForm');
let voiceRecognition = null;
let voiceActive = false;
let voiceStream = null;
let voiceRecorder = null;
let voiceTimeout = null;

function storageKey(email) { return `daymark:${email}`; }
function getStoredUser() { return JSON.parse(localStorage.getItem('daymark-session') || 'null'); }
function saveUserData() {
  if (!state.user) return;
  const saved = JSON.parse(localStorage.getItem(storageKey(state.user.email)) || '{}');
  localStorage.setItem(storageKey(state.user.email), JSON.stringify({ ...saved, assignments: state.assignments }));
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
function dateForSpokenText(text) {
  const base = new Date(2026, 8, 14, 12);
  const lower = text.toLowerCase();
  if (lower.includes('tomorrow')) base.setDate(base.getDate() + 1);
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekday = weekdays.findIndex((day) => lower.includes(day));
  if (weekday >= 0) {
    const offset = (weekday - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + offset);
  }
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}
function assignmentFromSpeech(transcript) {
  const lower = transcript.toLowerCase();
  const timeMatch = lower.match(/(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let hour = timeMatch ? Number(timeMatch[1]) : 17;
  const minute = timeMatch?.[2] || '00';
  if (timeMatch?.[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (timeMatch?.[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
  const title = transcript.replace(/\b(remind me to|add|schedule|assignment|every day|daily|today|tomorrow|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/gi, '').replace(/\s+/g, ' ').trim() || 'New assignment';
  return { id: crypto.randomUUID(), title: title.charAt(0).toUpperCase() + title.slice(1), date: dateForSpokenText(transcript), time: `${String(hour).padStart(2, '0')}:${minute}`, reminder: /every day|daily/i.test(lower) ? 'daily' : '60', color: 'teal', completed: false };
}
function startVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = $('#voiceButton'); const status = $('#voiceStatus'); const transcript = $('#voiceTranscript');
  if (voiceActive) {
    voiceActive = false;
    clearTimeout(voiceTimeout);
    voiceTimeout = null;
    voiceRecognition?.stop();
    voiceRecorder?.stop();
    voiceStream?.getTracks().forEach((track) => track.stop());
    voiceStream = null;
    voiceRecorder = null;
    button.classList.remove('recording');
    status.textContent = 'Tap to speak again';
    return;
  }
  if (!window.isSecureContext && location.hostname !== 'localhost') {
    status.textContent = 'Microphone needs HTTPS on another device';
    showToast('Open the app on localhost or use HTTPS to enable the microphone.');
    return;
  }
  const beginSession = () => {
    voiceActive = true;
    button.classList.add('recording');
    transcript.classList.add('hidden');
    status.textContent = SpeechRecognition ? 'Listening… say the assignment and due time' : 'Recording… speech-to-text is not supported here';
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      voiceRecognition = recognition;
      recognition.lang = 'en-US'; recognition.interimResults = false; recognition.continuous = true; recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        const assignment = assignmentFromSpeech(spokenText);
        state.assignments.push(assignment); saveUserData(); renderAll();
        transcript.textContent = `Heard: “${spokenText}”`; transcript.classList.remove('hidden');
        showToast(`Added “${assignment.title}” to your planner.`);
      };
      recognition.onerror = (event) => { if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { voiceActive = false; button.classList.remove('recording'); status.textContent = 'Microphone blocked. Allow it in browser settings.'; showToast('Microphone permission was blocked.'); } };
      recognition.onend = () => {
        if (voiceActive) {
          try { recognition.start(); } catch (error) { }
        } else {
          button.classList.remove('recording');
        }
      };
      recognition.start();
    }
    voiceTimeout = setTimeout(() => {
      if (!voiceActive) return;
      voiceActive = false;
      voiceRecognition?.stop();
      voiceRecorder?.stop();
      voiceStream?.getTracks().forEach((track) => track.stop());
      voiceStream = null;
      voiceRecorder = null;
      button.classList.remove('recording');
      status.textContent = 'Stopped after 15 seconds';
      showToast('Voice input stopped after 15 seconds.');
    }, 15000);
  };
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      voiceStream = stream;
      if (window.MediaRecorder) {
        voiceRecorder = new MediaRecorder(stream);
        voiceRecorder.start();
      }
      beginSession();
    }).catch(() => { status.textContent = 'Microphone blocked. Allow it in browser settings.'; showToast('Microphone permission was blocked.'); });
  } else {
    status.textContent = 'This browser cannot access the microphone';
    showToast('Microphone recording is not supported on this device.');
  }
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
    const today = dateString === '2026-09-14';
    const cell = document.createElement('button');
    cell.className = `calendar-day ${isCurrent ? 'current' : ''} ${today ? 'today' : ''} ${assignment ? 'has-assignment' : ''}`;
    cell.innerHTML = `<span class="day-label">${isCurrent ? dayNumber : dayNumber <= 0 ? previousMonthDays + dayNumber : dayNumber - daysInMonth}</span>${assignment ? `<span class="day-assignment">${assignment.title}</span>` : ''}`;
    cell.addEventListener('click', () => { $('#assignmentDate').value = dateString; assignmentDialog.showModal(); });
    grid.appendChild(cell);
  }
}
function renderAgenda() {
  const list = $('#assignmentList');
  const upcoming = [...state.assignments].filter((item) => !item.completed).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  list.innerHTML = upcoming.length ? upcoming.slice(0, 5).map((item) => `<article class="assignment-item ${item.color}" data-id="${item.id}"><span class="assignment-bar"></span><div><p class="assignment-title">${item.title}</p><p class="assignment-meta">${formatDate(item.date)} · ${formatTime(item.time)} · remind ${item.reminder === 'daily' ? 'every day' : item.reminder === '0' ? 'at due time' : `${item.reminder}m before`}</p></div><button class="complete-button" aria-label="Complete ${item.title}">✓</button></article>`).join('') : '<p class="empty-state">Your agenda is open. Add something worth remembering.</p>';
  list.querySelectorAll('.complete-button').forEach((button) => button.addEventListener('click', () => completeAssignment(button.closest('.assignment-item').dataset.id)));
  const next = upcoming[0];
  $('#nextUpTitle').textContent = next ? next.title : 'Your day is clear.';
  $('#nextUpMeta').textContent = next ? `${formatDate(next.date)} at ${formatTime(next.time)}` : 'Add an assignment to see it here.';
  $('#nextUpTime').textContent = next ? formatTime(next.time) : '—';
  const weekCount = upcoming.filter((item) => (new Date(`${item.date}T12:00:00`) - new Date('2026-09-14T12:00:00')) / 86400000 < 7).length;
  $('#progressLabel').textContent = `${weekCount} assignment${weekCount === 1 ? '' : 's'} due`;
  $('#progressBar').style.width = `${Math.min(100, weekCount * 24)}%`;
}
function completeAssignment(id) { state.assignments = state.assignments.map((item) => item.id === id ? { ...item, completed: true } : item); saveUserData(); renderAll(); showToast('Marked complete. Nice work.'); }
function renderAll() { renderCalendar(); renderAgenda(); }
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
  $('#firstName').textContent = user.email.split('@')[0].split(/[._-]/)[0].replace(/^./, (letter) => letter.toUpperCase());
  authView.classList.add('hidden'); plannerView.classList.remove('hidden'); renderAll();
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = $('#emailInput').value.trim().toLowerCase(); const password = $('#passwordInput').value;
  const saved = JSON.parse(localStorage.getItem(storageKey(email)) || 'null');
  if (saved?.password && saved.password !== password) { $('#authError').textContent = 'That password does not match this account.'; return; }
  localStorage.setItem(storageKey(email), JSON.stringify({ ...(saved || {}), password, assignments: saved?.assignments || [] }));
  const user = { email }; localStorage.setItem('daymark-session', JSON.stringify(user)); openPlanner(user);
});
$('#profileButton').addEventListener('click', () => { localStorage.removeItem('daymark-session'); plannerView.classList.add('hidden'); authView.classList.remove('hidden'); authForm.reset(); });
$('#openAddButton').addEventListener('click', () => { $('#assignmentDate').value = '2026-09-14'; assignmentDialog.showModal(); });
$('#closeAssignmentButton').addEventListener('click', () => assignmentDialog.close());
$('#navAdd').addEventListener('click', () => { $('#assignmentDate').value = '2026-09-14'; assignmentDialog.showModal(); });
$('#prevMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
$('#navReminders').addEventListener('click', () => { const next = state.assignments.find((item) => !item.completed); showToast(next ? `Next reminder: ${next.title}` : 'No reminders yet.'); });
$('#voiceButton').addEventListener('click', startVoiceInput);
$('#notificationButton').addEventListener('click', async () => { if (!('Notification' in window)) { showToast('Browser reminders are not supported here.'); return; } const permission = await Notification.requestPermission(); if (permission === 'granted') { $('#notificationDot').classList.remove('hidden'); showToast('Browser reminders enabled.'); } else showToast('Reminders stay on inside your planner.'); });
assignmentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const selectedColor = document.querySelector('input[name="assignmentColor"]:checked').value;
  state.assignments.push({ id: crypto.randomUUID(), title: $('#assignmentTitle').value.trim(), date: $('#assignmentDate').value, time: $('#assignmentTime').value, reminder: $('#assignmentReminder').value, color: selectedColor, completed: false });
  saveUserData(); assignmentDialog.close(); assignmentForm.reset(); $('#assignmentTime').value = '17:00'; renderAll(); showToast('Assignment saved to your agenda.');
});

const existingUser = getStoredUser();
if (existingUser) openPlanner(existingUser);
setInterval(checkReminders, 30000);
