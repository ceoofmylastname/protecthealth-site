// Broker-facing "Connect Your Google Calendar" tutorial.
//
// ONE source of truth, rendered in two places:
//   1. /help/google-calendar  (a real page, so it can be emailed to brokers)
//   2. the popup inside the CRM Availability tab (src/pages/app.astro)
// Edit here and both update. Plain HTML string because app.astro injects it
// into a modal with set:html.

export const GCAL_HELP_HTML = `
<p class="gh-lede">Once your Google Calendar is linked, any time you are already busy on Google is automatically blocked on your ProtectHealth booking page. Clients cannot book on top of a dentist appointment, a listing showing, or a lunch. Your Google events also show on your ProtectHealth calendar, so there is one place to look.</p>
<p class="gh-lede">Takes about two minutes. You only do it once.</p>

<h3>Before you start</h3>
<p>Know which Google account holds the calendar you actually live in. If you use more than one Gmail, pick the one where your real appointments already are. You can add calendars from a second account later (see the last section).</p>

<h3>Part 1: Connect your account</h3>
<ol>
  <li>Sign in at <b>protecthealth.com/app</b>.</li>
  <li>In the left menu, click <b>Availability</b>.</li>
  <li>Scroll to the bottom card, <b>Link your Google Calendar</b>.</li>
  <li>Click <b>Connect Google Calendar</b>.</li>
  <li>Google asks which account to use. Pick the account with your real calendar. If it is not listed, click <b>Use another account</b> and sign in.</li>
  <li>You will see a screen that says <b>"Google hasn't verified this app."</b> This is expected and it is safe. It appears because our CRM is a private company tool, not a public app in the Google store. Click <b>Advanced</b>, then <b>Go to ProtectHealth (unsafe)</b>. Nothing here is actually unsafe, that is just the wording Google uses for private company apps.</li>
  <li>Google lists the access being requested. Leave both calendar boxes checked and click <b>Continue</b>.</li>
  <li>You land back on your dashboard with a green <b>Connected</b> badge. Done.</li>
</ol>
<p class="gh-note"><b>If you never saw the checkboxes in step 7</b>, back out and start again at step 4. Without those permissions nothing can be blocked.</p>

<h3>Part 2: Choose which calendars block your bookings</h3>
<p>Right under the Connected badge is every calendar in that Google account.</p>
<ol>
  <li>Check every calendar that represents time you are genuinely busy. Your main calendar is checked by default.</li>
  <li>Leave the noise unchecked. Holiday calendars, sports schedules, and birthday calendars will block real client bookings if you check them, which is almost never what you want.</li>
  <li>Click <b>Save calendar selection</b>.</li>
</ol>
<p>Change this any time. Checking a calendar never lets us edit it, and unchecking one deletes nothing.</p>
<p class="gh-note"><b>Rule of thumb:</b> if an event on that calendar means you cannot take a client call, check it.</p>

<h3>Part 3: Test it (worth the 60 seconds)</h3>
<ol>
  <li>In Google Calendar, create an event for tomorrow at a time you normally work, say 2:00 PM. Title it "Test."</li>
  <li>Back in ProtectHealth, go to <b>Availability</b> and click <b>Preview my booking page</b>.</li>
  <li>Look at tomorrow. The 2:00 PM slot should be gone.</li>
  <li>Open the <b>Calendar</b> tab. Your Test event shows in gray with a dashed outline. Gray dashed means it came from Google. Solid blue means a real ProtectHealth appointment.</li>
  <li>Delete the Test event in Google when you are done. The slot comes back on its own.</li>
</ol>

<h3>Part 4: Adding a calendar from a different Google account</h3>
<p>The CRM links one Google account per broker. If your appointments are split across two accounts, share the second one into the first. Google handles this natively.</p>
<ol>
  <li>Sign in to the <b>second</b> Google account at <b>calendar.google.com</b>.</li>
  <li>On the left under <b>My calendars</b>, hover the calendar you want to share.</li>
  <li>Click the three dots, then <b>Settings and sharing</b>.</li>
  <li>Scroll to <b>Share with specific people or groups</b> and click <b>Add people and groups</b>.</li>
  <li>Enter the email address of the Google account you connected to ProtectHealth.</li>
  <li>Set permission to <b>See all event details</b>. Do not give edit access, it is not needed.</li>
  <li>Click <b>Send</b>.</li>
  <li>Open the inbox of your connected account and accept the invitation.</li>
  <li>Return to ProtectHealth, open <b>Availability</b>, and reload the page. The shared calendar now appears in your list.</li>
  <li>Check it and click <b>Save calendar selection</b>.</li>
</ol>
<p>Both calendars now block your booking page.</p>

<h3>Troubleshooting</h3>
<p><b>The slot did not disappear on my booking page.</b><br>Confirm the calendar holding that event is checked and saved in Part 2. Then open the event in Google and check its Busy/Free setting. Google treats <b>Free</b> events as available time, so we do too. Set it to <b>Busy</b>.</p>
<p><b>I connected the wrong Google account.</b><br>Click <b>Disconnect</b>, then run Part 1 again and choose the right account. Nothing is lost.</p>
<p><b>I do not see a calendar I expect.</b><br>It is probably on a different Google account. Use Part 4 to share it over.</p>
<p><b>A calendar I shared is not showing up.</b><br>Accept the sharing invitation in the connected account first, then reload the Availability page.</p>
<p><b>It says my connection needs to be re-linked.</b><br>That happens if you changed your Google password or revoked access. Click <b>Disconnect</b>, then reconnect with Part 1.</p>
<p><b>Google is down or slow.</b><br>Your booking page keeps working normally. If Google cannot be reached we show your regular availability rather than blocking everything.</p>

<h3>What we can and cannot see</h3>
<p>We read the times you are busy and your event titles, so your calendar is useful on your dashboard. We never show your personal events to clients. Clients only ever see open or unavailable time on your booking page, never what you are doing.</p>
<p>Cut off access any time with <b>Disconnect</b> on the Availability page, or from your Google account under Security, Third party apps.</p>

<h3>Quick reference</h3>
<table class="gh-table">
  <thead><tr><th>Task</th><th>Where</th></tr></thead>
  <tbody>
    <tr><td>Connect Google</td><td>Availability, bottom card, Connect Google Calendar</td></tr>
    <tr><td>Change which calendars block bookings</td><td>Availability, checkboxes, Save calendar selection</td></tr>
    <tr><td>See Google events with your appointments</td><td>Calendar tab, gray dashed events</td></tr>
    <tr><td>Add a calendar from another account</td><td>Share it in Google first, then reload Availability</td></tr>
    <tr><td>Turn it off</td><td>Availability, Disconnect</td></tr>
  </tbody>
</table>
`;
