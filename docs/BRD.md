# Business Requirements Document (BRD)
## Dronacharya: Live Online Classes, Admissions and Class Quality for 21K School

**Document version:** 4.0 (class analytics release)
**Organisation:** 21K School / 21K Learning Floww
**Owners:** Academic Excellence, Admissions, Quality & Compliance
**Status:** Implemented

---

### 1. Business context

#### 1.1 What the school needs
21K School teaches K-12 learners online across countries and timezones, in one-to-one classes, small groups
and cohorts of up to 24. The school needs:
1. **Reliable live classes** that every learner can join on an approved device, with recordings, captions in
   their language and notes afterwards.
2. **Trust from families**: parents see attendance and progress, decide on recording and engagement analytics,
   and class content can't easily be copied or shared.
3. **An admissions pipeline that converts**: counselling, demo and admission sessions that lead families to
   enrol, with the counsellor's time spent well.
4. **Oversight of teaching quality**: auditors and academic leaders must see, with real data, how classes are
   going: by teacher, room, time slot, timezone, course, cohort, grade, class size and geography. Today that
   picture is assembled by hand from spreadsheets, or not at all.

#### 1.2 The conversion problem (admissions)
Group demo webinars convert poorly because parents stay passive and follow-up happens days later. The
platform supports one-to-one counselling and demo sessions inside the live classroom, and now **measures**
them: conversation length, no-shows, and how many families enrol within 30 days.

> The earlier versions of this document projected conversion and revenue gains (for example "39% demo to
> enrolment"). Those were **hypotheses**, never measured. Class analytics now measures the real rate (see
> §2), and the projections should be replaced with measured baselines after the first full term.

---

### 2. Business objectives and how they're measured

All measures below are live in **Class analytics** (auditors and admins), with definitions on the page ("How
we measure").

| Objective | Measure | Default target |
| :--- | :--- | :--- |
| Classes happen as scheduled | Delivery funnel: scheduled → held → started on time → ran full length | — |
| Classes start on time | On-time starts (within the target delay); average start delay | Start within 5 min |
| Seats are used | Occupancy: learners who came ÷ seats planned (pooled) | 70% |
| Enrolled learners attend | Attendance rate: enrolled learners who came ÷ enrolled | 85% |
| Classes are good | Average class quality (0–100), share below target | 75 |
| Teachers are good, fairly judged | Teacher quality (hours-weighted, small-sample adjusted, ranked from 5 classes) | 75 |
| Counselling converts | Families who enrolled within 30 days of counselling, admission or a demo | Baseline first term |
| Counselling time is well spent | Average conversation length; no-show rate | Baseline first term |
| Content stays in the school | Capture attempts per 100 sessions | Downward trend |

Admins change targets and quality weights in the dashboard; changes apply to every score immediately.

---

### 3. Stakeholder requirements

#### 3.1 Academic leadership and auditors
- **BR-QA-1**: See class quality, occupancy, class duration, counselling (sales) length, punctuality and
  attendance, broken down by room, time slot, weekday, teacher, teacher or learner timezone, course,
  subject, cohort, grade, class size (1:1 to 1:24), session type, programme, language, learner country and device.
- **BR-QA-2**: See average class quality and average teacher quality, with a transparent formula and plain
  reasons for each score ("started 14 min late", "4 of 10 enrolled learners came").
- **BR-QA-3**: Be told what needs attention: weak classes, teachers whose recent classes got worse, rooms
  running empty, all against targets the school sets.
- **BR-QA-4**: Observe a live class without being seen or heard, and record a structured review that counts
  toward the class's quality.
- **BR-QA-5**: Export any view to CSV for board reports; every export is logged.
- **BR-QA-6**: Analytics are for auditors and admins only. Teachers do not see scores about themselves.

#### 3.2 Admissions
- **BR-ADM-1**: Book counselling, demo and admission sessions with the best-matched teacher and a signed
  invite link for the family.
- **BR-ADM-2**: Know how long conversations last, how often families don't show, and how many enrol.

#### 3.3 Teachers
- **BR-ACAD-1**: Start the class once for everyone; recording, transcript and notes happen automatically.
- **BR-ACAD-2**: See who came to their classes (on time, late, left early, absent) and contact the guardian.

#### 3.4 Families
- **BR-FAM-1**: See attendance, remarks and notes per child.
- **BR-FAM-2**: Decide on recording and engagement analytics; a withdrawal also clears past engagement data.

#### 3.5 Compliance
- **BR-COMP-1**: Child data protection (COPPA/GDPR-style): consent recorded with history, analytics only with
  consent, small learner groups never shown, no learner names in URLs.
- **BR-COMP-2**: Class content protected (watermark, capture deterrence, desktop app OS-level blocking) and
  capture attempts logged for auditors.

---

### 4. Operating model

```
Booking (admissions or scheduler, cohort assigned)
   └─▶ Live class (teacher starts it: recording + transcript begin)
          ├─▶ Auditor may observe hidden and draft a review
          └─▶ Teacher ends it
                 ├─▶ Notes (Gemini → local model → extractive)
                 ├─▶ Attendance (from LiveKit join/leave)
                 └─▶ Session facts (20 s after the end, refreshed after 10 min)
                        └─▶ Class analytics: targets, needs attention, review queue
```

---

### 5. Risks and mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Scores used unfairly against teachers | High | Transparent formula and reasons; small samples pulled toward the school average; teachers ranked only from 5 classes, with a likely range; moderation (muting, removing) never lowers a score; human auditor review included. |
| Engagement estimates misread as judgements | High | Engagement weight capped at 25 of 100; only consenting learners; shown as an estimate; low-consent classes adjusted so they can't score higher. |
| Learner privacy in geographic breakdowns | High | Learner groups under 3 hidden; no individual learners in learner-level views; exports logged. |
| Missing data read as poor performance | Medium | Unknown attendance (no join data) is unknown, not zero; classes with fewer than 3 signals and classes nobody joined aren't scored; false starts under 3 minutes left out. |
| Demo data mistaken for real results | Medium | Demo history is development-only, marked `demo-`, bannered on the dashboard, and never shown outside analytics. |
| Sample screens mistaken for live records | Medium | Remaining illustrative screens carry a "Sample" notice. |
