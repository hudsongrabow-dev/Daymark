'use client';

import { useEffect } from 'react';
import { createClient } from '../utils/supabase/client.mjs';

const plannerMarkup = `
  <main class="app-shell">
    <section class="auth-view" id="authView" aria-label="Sign in">
      <div class="auth-art" aria-hidden="true">
        <span class="art-sun"></span><span class="art-line art-line-one"></span><span class="art-line art-line-two"></span>
        <span class="art-note note-one">09:00</span><span class="art-note note-two">focus</span>
      </div>
      <div class="auth-content">
        <p class="eyebrow">DAYMARK / PERSONAL PLANNER</p>
        <h1>A calmer place<br /><em>to get things done.</em></h1>
        <p class="auth-copy">Keep deadlines visible, make space for what matters, and let your future self get a gentle nudge.</p>
        <div class="auth-panels">
          <button class="auth-panel auth-choice" id="showSignUpButton" type="button"><span class="auth-choice-title">Sign up</span><span class="auth-choice-description">Create your account <span aria-hidden="true">→</span></span></button>
          <button class="auth-panel auth-choice" id="showLoginButton" type="button"><span class="auth-choice-title">Log in</span><span class="auth-choice-description">Welcome back <span aria-hidden="true">→</span></span></button>
        </div>
        <p class="form-error" id="authError" role="alert"></p>
        <form id="signUpForm" class="auth-fields hidden">
          <button class="auth-back-button" data-auth-back type="button">← Back</button>
          <label>Username (email) <input id="signUpEmail" type="email" autocomplete="username" required /></label>
          <label>Password <span class="password-control"><input id="signUpPassword" type="password" autocomplete="new-password" minlength="6" required /><button class="password-toggle" data-password-target="signUpPassword" type="button" aria-label="Show password">Show</button></span></label>
          <button class="primary-button" type="submit">Create account <span aria-hidden="true">→</span></button>
        </form>
        <form id="loginForm" class="auth-fields hidden">
          <button class="auth-back-button" data-auth-back type="button">← Back</button>
          <label>Username (email) <input id="loginEmail" type="email" autocomplete="username" required /></label>
          <label>Password <span class="password-control"><input id="loginPassword" type="password" autocomplete="current-password" required /><button class="password-toggle" data-password-target="loginPassword" type="button" aria-label="Show password">Show</button></span></label>
          <button class="primary-button" type="submit">Log in <span aria-hidden="true">→</span></button>
        </form>
        <button class="secondary-button guest-button" id="guestAccessButton" type="button">Continue as guest</button>
        <p class="auth-hint">Create an account, log in, or continue as a guest.</p>
      </div>
    </section>

    <section class="planner-view hidden" id="plannerView" aria-label="Planner">
      <header class="topbar"><div class="brand-mark"><span class="brand-dot"></span>daymark</div><div class="topbar-actions">
        <button class="icon-button notification-button" id="notificationButton" aria-label="Enable browser reminders" title="Enable browser reminders">♧<span class="notification-dot hidden" id="notificationDot"></span></button>
        <button class="avatar" id="profileButton" aria-label="Home" title="Home">Home</button>
      </div></header>
      <div class="welcome-row"><div><p class="eyebrow" id="todayLabel">TODAY</p><h2>Good morning, <span id="firstName">Jordan</span>.</h2></div><button class="add-button" id="openAddButton"><span>+</span> Add assignment</button></div>
      <div class="content-grid">
        <section class="calendar-card panel"><div class="section-heading"><div><p class="section-kicker">YOUR MONTH</p><h3 id="monthTitle">September 2026</h3></div><div class="calendar-nav"><button class="icon-button" id="prevMonth" aria-label="Previous month">←</button><button class="icon-button" id="nextMonth" aria-label="Next month">→</button></div></div>
          <p class="calendar-quote" id="dailyQuote">“Small steps count.”</p><div class="weekdays" aria-hidden="true"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div><div class="calendar-grid" id="calendarGrid"></div><div class="calendar-legend"><span><i class="legend-dot coral"></i> assignment</span><span><i class="legend-dot teal"></i> today</span></div>
        </section>
        <aside class="agenda-column"><section class="focus-card panel"><div class="focus-topline"><span class="live-dot"></span> NEXT UP <span class="focus-time" id="nextUpTime">—</span></div><h3 id="nextUpTitle">Your day is clear.</h3><p id="nextUpMeta">Add an assignment to see it here.</p><div class="progress-track"><span id="progressBar"></span></div><div class="progress-caption"><span id="progressLabel">0 assignments due</span><span>this week</span></div></section>
          <section class="agenda-section"><div class="section-heading compact"><div><p class="section-kicker">UPCOMING</p><h3>Your agenda</h3></div><span class="date-badge" id="agendaDate">TODAY</span></div><div class="assignment-list" id="assignmentList"></div></section>
        </aside>
      </div>
      <nav class="bottom-nav" aria-label="Primary navigation"><button class="nav-item active"><span>▦</span>Overview</button><button class="nav-item" id="navAdd"><span>＋</span>Add</button><button class="nav-item" id="navReminders"><span>◷</span>Reminders</button><button class="nav-item" id="signOutButton"><span>↪</span>Sign out</button></nav>
    </section>
  </main>
  <dialog class="assignment-dialog" id="assignmentDialog"><form method="dialog" id="assignmentForm" class="dialog-card"><button class="close-button" id="closeAssignmentButton" type="button" aria-label="Close">×</button><p class="section-kicker">NEW ENTRY</p><h2>Make it visible.</h2><p class="dialog-copy">A clear next step is a kind thing to leave yourself.</p><label>Assignment title <input id="assignmentTitle" type="text" placeholder="e.g. Biology reading" required /></label><div class="form-row"><label>Due date <input id="assignmentDate" type="date" required /></label><label>Time <input id="assignmentTime" type="time" value="17:00" required /></label></div><label>Remind me <select id="assignmentReminder"><option value="0">At due time</option><option value="15">15 minutes before</option><option value="60" selected>1 hour before</option><option value="1440">1 day before</option><option value="daily">Every day at this time</option></select></label><label class="color-choice">Color <span class="color-picker-list"><label class="swatch-option"><input type="radio" name="assignmentColor" value="coral" checked /><i class="swatch coral" aria-label="Coral"></i></label><label class="swatch-option"><input type="radio" name="assignmentColor" value="teal" /><i class="swatch teal" aria-label="Teal"></i></label><label class="swatch-option"><input type="radio" name="assignmentColor" value="yellow" /><i class="swatch yellow" aria-label="Yellow"></i></label><label class="swatch-option"><input type="radio" name="assignmentColor" value="lavender" /><i class="swatch lavender" aria-label="Lavender"></i></label><label class="swatch-option"><input type="radio" name="assignmentColor" value="mint" /><i class="swatch mint" aria-label="Mint"></i></label><label class="swatch-option"><input type="radio" name="assignmentColor" value="sky" /><i class="swatch sky" aria-label="Sky"></i></label><label class="swatch-option custom-color-option"><input type="radio" name="assignmentColor" value="custom" /><span class="swatch custom" aria-label="Custom color">✦</span></label></span></label><label class="custom-color-control hidden" id="customColorWrapper">Custom color <input id="assignmentCustomColor" type="color" value="#ee7e67" /></label><button class="primary-button" type="submit">Save assignment <span aria-hidden="true">→</span></button></form></dialog><div class="toast" id="toast" role="status"></div>
`;

export default function Page() {
  useEffect(() => {
    try {
      window.daymarkSupabase = window.daymarkSupabase || createClient();
    } catch (error) {
      const authError = document.getElementById('authError');
      if (authError) authError.textContent = error.message;
    }
    if (window.__daymarkLoaded) return undefined;
    window.__daymarkLoaded = true;
    const script = document.createElement('script');
    script.src = '/app.js?next=1';
    script.async = false;
    document.body.appendChild(script);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
    return undefined;
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: plannerMarkup }} />;
}
