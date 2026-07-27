// Cloudflare Pages Function, mirrors netlify/functions/book.mjs. Keep both in sync.
// Talk To A Broker booking → GoHighLevel.
//
// POST /api/book
//
// One request does the whole job: upserts the contact, books the real
// appointment on the ProtectHealth Consultation calendar, attaches the intake
// answers as a note, and opens an opportunity in the pipeline. The GHL native
// "Appointment Booked" trigger fires off the appointment itself, so all
// confirmations/reminders/pipeline automation hang off real calendar state
// rather than a fire-and-forget webhook.
//
// Requires env var GHL_API_TOKEN (GHL Private Integration token) with
// contacts.write + opportunities.write + calendars.readonly + calendars/events.write.

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const LOCATION_ID = 'nF7RwerbB5hn27XaM9D2';
const BOOKING_CALENDAR_ID = 'naoB13PMLUxH7fAcVXg0'; // ProtectHealth Consultation
const BUSINESS_TZ = 'America/Los_Angeles';

// The conversation is twenty minutes. The calendar's own slotDuration is the
// source of truth for GHL, but we set endTime explicitly so the broker's
// calendar blocks the full twenty regardless of how the calendar is configured.
const SLOT_MINUTES = 20;

// ProtectHealth New Lead/Client pipeline
const PIPELINE_ID = 'u24rkrB1oRJhb8cZnZvF';
const STAGE_NEW_LEAD = '46900ce3-750b-4d41-a1d4-a79d014a784b';

const BASE_TAGS = ['talk-to-a-broker', 'source:website', 'booked-online'];

// Intake answers, in the order the page asks them. Keys match the form.
const INTAKE_FIELDS = [
  ['role', 'Which best describes you'],
  ['structure', 'Business structure'],
  ['coverage', 'Current coverage situation'],
  ['priority', 'What matters most in this conversation'],
  ['notes', 'Anything else before we talk'],
];

// Routes the lead into the right campaign reporting without changing the
// conversation. Mirrors the CAMPAIGNS map in lead.js.
const ROLE_TAGS = {
  Realtor: 'campaign:ichra',
  '1099 contractor': 'campaign:ichra',
  'Self-employed': 'campaign:ichra',
  'Small business owner with a team': 'campaign:paychex',
  // Individuals belong to neither campaign. Tagging them into ICHRA or
  // Paychex reporting would inflate both and mis-route their follow-up.
  'Individual or family': 'audience:individual',
};

// ── Website Intake custom fields ─────────────────────────────────────────────
// Created in GHL on 2026-07-25 under the "Website Intake" folder. Ids rather
// than keys, because /contacts/upsert resolves ids without a second lookup.
// Keep this block byte-identical in lead.js, book.js, lead-magnet.js and their
// netlify/functions mirrors.
const CF = {
  role:        'KFgNfn7tOxlTCmvjvTNj', // Website Intake: Which Best Describes You
  structure:   'hN30YvoSCFjYZyl2WYzc', // Website Intake: Business Structure
  coverage:    'j39bQETsnhN3IHgHl6eA', // Website Intake: Current Coverage
  priority:    'XAWgGwWLHnw4qQLUNAVv', // Website Intake: What Matters Most
  notes:       'p9xHNA0ev7CyVgwriRXU', // Website Intake: Notes From Lead
  timezone:    '2zyAtyCO5Xd1QKfRLCVI', // Website Intake: Visitor Timezone
  industry:    'wDaeieEvNZtIDU419r2T', // Website Intake: Industry
  employees:   'lecOVPOTtfw5PLObZjYQ', // Website Intake: Employee Count
  friction:    '5P4t9QZM7l2nVSf2N1m6', // Website Intake: Biggest Friction
  payroll:     'ioUxcZEZUtWdOrNcGN7z', // Website Intake: Payroll Provider
  sourceForm:  '2u611YcsKF5hCczUvpMw', // Website Intake: Source Form
  page:        'gz9zZmpnqjpJYm6ig9nU', // Website Intake: Landing Page
  appointment: 'TkMZgKyFxOvXOpJZ0Jji', // Website Intake: Appointment Time
  magnet:      'ES17xjYL7S5hOepLnXGj', // Website Intake: Lead Magnet
};

// Every form asks "which best describes you" under a different key: the ICHRA
// page calls it profile, the quote and contact pages call it interest, the
// booking page calls it role. One column, three spellings.
const ROLE_KEYS = ['role', 'profile', 'interest'];

// Builds the customFields array for an upsert. Blank answers are dropped rather
// than sent as '', because /contacts/upsert merges what it receives, a lead who
// books after filling a shorter form keeps the answers the longer form captured.
function intakeFields(data, extra = {}) {
  const merged = { ...data, ...extra };
  const clean = (v) => String(v ?? '').trim();
  const role = ROLE_KEYS.map((k) => clean(merged[k])).find((v) => v !== '');
  return [
    [CF.role, role],
    [CF.structure, merged.structure],
    [CF.coverage, merged.coverage],
    [CF.priority, merged.priority],
    [CF.notes, merged.notes],
    [CF.timezone, merged.timezone],
    [CF.industry, merged.industry],
    [CF.employees, merged.employees],
    [CF.friction, merged.friction],
    [CF.payroll, merged.payroll],
    [CF.sourceForm, merged.sourceForm],
    [CF.page, merged.page],
    [CF.appointment, merged.appointmentTime],
    [CF.magnet, merged.magnet],
  ]
    .filter(([, value]) => clean(value) !== '')
    .map(([id, value]) => ({ id, field_value: clean(value) }));
}


// Supabase (ProtectHealth Ticketing System), mirrors leads into ph_leads and
// queues the confirmation + reminder emails. Requires env var PH_HOOK_SECRET.
const PH_HOOK = 'https://hrzonmnswzwridwqbspb.supabase.co/functions/v1/ph-booking-emails';

// Deliberately non-fatal. A reporting or email failure must never cost us a
// booking that GoHighLevel has already accepted, so this logs and moves on.
async function recordLead(secret, payload) {
  if (!secret) return;
  try {
    const res = await fetch(PH_HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ph-secret': secret },
      body: JSON.stringify({ action: 'record', ...payload }),
    });
    if (!res.ok) console.error('ph record failed:', res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error('ph record error:', err.message);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  if (!/^[A-Za-z0-9+\-_/]+$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Adds minutes to an ISO string while keeping its original UTC offset, so the
// value we hand GHL stays in the same wall-clock frame the visitor picked.
function addMinutes(iso, mins) {
  const match = iso.match(/(Z|[+-]\d{2}:\d{2})$/);
  const offset = match ? match[1] : 'Z';
  const shifted = new Date(new Date(iso).getTime() + mins * 60000);
  if (offset === 'Z') return shifted.toISOString().replace('.000Z', 'Z');

  const sign = offset[0] === '-' ? -1 : 1;
  const [oh, om] = offset.slice(1).split(':').map(Number);
  const local = new Date(shifted.getTime() + sign * (oh * 60 + om) * 60000);
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}` +
    `T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}${offset}`
  );
}

async function ghl(path, method, token, body) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = {};
  try { parsed = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(`GHL ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return parsed;
}

// Confirms the chosen slot is still open before we write to the calendar.
// Belt and braces: the consultation calendar allows multiple bookings per
// slot, so GHL will not reject a collision on our behalf.
async function slotStillFree(token, startTime, timezone) {
  const target = new Date(startTime).getTime();
  const qs = new URLSearchParams({
    startDate: String(target - 86400000),
    endDate: String(target + 86400000),
    timezone,
  });
  const raw = await ghl(
    `/calendars/${BOOKING_CALENDAR_ID}/free-slots?${qs}`,
    'GET',
    token
  );
  return Object.entries(raw)
    .filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(value?.slots))
    .some(([, value]) => value.slots.some((s) => new Date(s).getTime() === target));
}

export async function onRequestPost(context) {
  const env = context.env;
  const token = env.GHL_API_TOKEN;
  if (!token) return json({ error: 'GHL_API_TOKEN not configured' }, 500);

  let data;
  try { data = await context.request.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const firstName = String(data.first_name || '').trim();
  const lastName = String(data.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const startTime = String(data.startTime || '').trim();
  const timezone = isValidTimeZone(data.timezone) ? data.timezone : BUSINESS_TZ;

  if (!email && !phone) return json({ error: 'Email or phone required' }, 400);
  if (!startTime || Number.isNaN(new Date(startTime).getTime())) {
    return json({ error: 'A valid appointment time is required' }, 400);
  }
  if (new Date(startTime).getTime() < Date.now()) {
    return json({ error: 'That time has already passed. Pick another.' }, 409);
  }

  const endTime = addMinutes(startTime, SLOT_MINUTES);
  // Human-readable appointment time in Las Vegas hours. Written to the
  // contact as well as the note so workflows and SMS can merge it.
  const when = new Date(startTime).toLocaleString('en-US', {
    timeZone: BUSINESS_TZ,
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const roleTag = ROLE_TAGS[String(data.role || '').trim()];
  const tags = roleTag ? [...BASE_TAGS, roleTag] : BASE_TAGS;

  let contactId;

  try {
    // 1. Slot re-check, so two people picking the same time a minute apart
    //    don't both land on a broker's calendar.
    const free = await slotStillFree(token, startTime, timezone);
    if (!free) {
      return json(
        { error: 'slot_taken', message: 'That time was just booked. Pick another and you are all set.' },
        409
      );
    }

    // 2. Upsert contact (dedupes on email/phone per location settings)
    const upsert = await ghl('/contacts/upsert', 'POST', token, {
      locationId: LOCATION_ID,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      tags,
      timezone,
      source: 'website:talk-to-a-broker',
      customFields: intakeFields(data, {
        sourceForm: 'talk-to-a-broker',
        timezone,
        page: data.page || '/talk-to-a-broker',
        appointmentTime: `${when} (Las Vegas)`,
      }),
    });
    contactId = upsert?.contact?.id;
    if (!contactId) throw new Error('No contact id returned from upsert');

    // 3. The appointment itself. Everything downstream in GHL hangs off this.
    const appointment = await ghl('/calendars/events/appointments', 'POST', token, {
      calendarId: BOOKING_CALENDAR_ID,
      locationId: LOCATION_ID,
      contactId,
      startTime,
      endTime,
      title: `Strategy Conversation, ${fullName || email || phone}`,
      appointmentStatus: 'confirmed',
      ignoreDateRange: false,
      ignoreFreeSlotValidation: false,
      toNotify: true,
    });

    // 4. Intake answers as a note, so the broker walks in prepared.
    const answers = INTAKE_FIELDS
      .map(([key, label]) => [label, String(data[key] || '').trim()])
      .filter(([, value]) => value !== '');
    await ghl(`/contacts/${contactId}/notes`, 'POST', token, {
      body:
        `Talk To A Broker, booked online\n` +
        `Appointment: ${when} (Las Vegas time)\n` +
        `Visitor timezone: ${timezone}\n\n` +
        (answers.length
          ? answers.map(([label, value]) => `${label}: ${value}`).join('\n')
          : 'Qualifying answers were captured on the campaign form, see the earlier note on this contact.'),
    });

    // 5. Opportunity in the ProtectHealth pipeline.
    await ghl('/opportunities/', 'POST', token, {
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_NEW_LEAD,
      contactId,
      name: `Strategy Conversation, ${fullName || email || phone}`,
      status: 'open',
    });

    const appointmentId = appointment?.id || appointment?.appointment?.id || null;

    // 6. Mirror to Supabase, which sends the confirmation now and queues the
    //    24-hour and 1-hour reminders.
    await recordLead(env.PH_HOOK_SECRET, {
      kind: 'booking',
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role: data.role ?? null,
      structure: data.structure ?? null,
      coverage: data.coverage ?? null,
      priority: data.priority ?? null,
      notes: data.notes ?? null,
      source_form: 'talk-to-a-broker',
      page: data.page ?? '/talk-to-a-broker',
      appointment_start: startTime,
      appointment_end: endTime,
      timezone,
      ghl_contact_id: contactId,
      ghl_appointment_id: appointmentId,
    });

    return json({
      ok: true,
      appointmentId,
      startTime,
      endTime,
      timezone,
    });
  } catch (err) {
    console.error('book function error:', err.message);
    // The contact exists even when the calendar write fails, so the lead is
    // never lost, say so rather than showing a dead end.
    if (contactId) {
      return json(
        {
          error: 'booking_failed',
          message: 'Your details reached us, but the calendar did not confirm. A broker will call to set the time.',
        },
        502
      );
    }
    return json({ error: 'booking_failed', message: 'Booking failed. Please call 800-240-8185.' }, 502);
  }
}
