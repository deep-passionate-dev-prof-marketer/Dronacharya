# Business Requirements Document (BRD)
## Dronacharya: Enterprise EdTech Operations & 1:1 High-Conversion Sales Architecture

**Document Version:** 2.4.0  
**Target Organization:** 21K School Global / 21K Learning Floww  
**Department:** Business Operations, Revenue Architecture & Academic Excellence  
**Status:** Approved for Implementation

---

### 1. Business Context & Strategic Imperatives

#### 1.1 The EdTech Conversion Problem
In online K-12 education, standard group webinar demos (1 teacher to 30–100 parents) yield abysmal conversion rates (averaging 8%–14%). Group environments create three major business bottlenecks:
1. **The Parent Invisibility Effect**: Parents remain passive spectators with cameras and microphones muted; their personal concerns (child's specific learning challenges, curriculum pacing, affordability) are never surfaced.
2. **Delayed Sales Follow-up**: Traditional workflows require sales representatives to follow up via phone or WhatsApp 24–72 hours later, by which time parent intent has decayed by over 70%.
3. **High Customer Acquisition Cost (CAC)**: With digital lead costs escalating, failing to convert attendees during the live demo inflates blended CAC to unsustainable levels ($350–$600 per enrolled student).

#### 1.2 The Strategic Solution: Room Bomber 1:1 Breakout
Dronacharya's **Room Bomber** engine fundamentally transforms the demo economics by enabling a hybrid webinar:
- **Phase 1 (20 Mins)**: Group Masterclass delivered by an elite STEM educator demonstrating curriculum superiority, 3D interactive simulations, and multi-device remote control.
- **Phase 2 (25 Mins)**: Automated **Room Bomb 💣** trigger instantly splits the group into isolated 1:1 rooms pairing one sales representative with each prospective parent-student pair.
- **Phase 3 (Close)**: In-room Pitch HUD equips the representative with custom tuition calculation, one-time scholarship authorization, and instant digital enrollment closure while intent is at its peak.

---

### 2. Business Objectives & Financial Projections

```
+-----------------------------------------------------------------------------------+
| Metric                              | Legacy Webinar | Dronacharya Room Bomber    |
+-----------------------------------------------------------------------------------+
| Demo Attendance to Enrolled Ratio   | 11.4%          | 39.2% (+244% improvement)  |
| Average Sales Cycle Duration        | 5.8 Days       | 42 Minutes (In-Session)    |
| Blended Customer Acquisition Cost   | $480 / Student | $145 / Student (-70% CAC)  |
| First-Session Parent CSAT           | 68%            | 94%                        |
| Teacher In-Class Retention Rate     | 82%            | 98%                        |
+-----------------------------------------------------------------------------------+
```

#### 2.1 Financial Model & Unit Economics
Assuming an average annual student tuition of $2,400:
- **Cohort Size**: 120 parent-student demo attendees per weekend.
- **Legacy Conversions (12%)**: 14 enrollments = $33,600 Gross Revenue.
- **Room Bomber Conversions (38%)**: 45 enrollments = $108,000 Gross Revenue.
- **Net Incremental Revenue per Weekend**: **+$74,400** (+$3.86M annualized).

---

### 3. Stakeholder Requirements

#### 3.1 Chief Commercial Officer & Sales Directors
- **BR-SALES-1**: Automated 1:1 allocation matching student count exactly to available sales personnel without manual Zoom breakout management delays.
- **BR-SALES-2**: Standardized sales script progression embedded into the counselor's HUD to ensure 100% adherence to pedagogical value framing.
- **BR-SALES-3**: Dynamic scholarship discounting governor allowing reps to grant up to 25% spot discount to close high-intent families, logged for audit.

#### 3.2 Academic Director & Facilitators
- **BR-ACAD-1**: Uninterrupted transition between collaborative classroom and breakout rooms with zero audio/video disconnections.
- **BR-ACAD-2**: Granular remote screen control allowing teachers to intervene on student devices across smartphones, tablets, and laptops.

#### 3.3 Quality & Compliance Auditors
- **BR-COMP-1**: Regulatory compliance with ISO 21001, NEASC, and COPPA child data protection guidelines.
- **BR-COMP-2**: Silent auditing capabilities enabling inspectors to observe class acoustics, attention levels, and sales interactions without participant notification.

---

### 4. Operational Workflows & Governance

```
[Lead Acquisition] --> [Group Masterclass (Main Hall)]
                                |
                   [1-Click "Execute Room Bomb"]
                                |
             +------------------+------------------+
             |                                     |
    [Breakout Room #1]                    [Breakout Room #2] ... [Breakout Room #N]
  (Sales Rep 1 + Family 1)              (Sales Rep 2 + Family 2)
             |                                     |
   [Interactive Pitch HUD]               [Interactive Pitch HUD]
             |                                     |
   [Spot Scholarship Close]              [Spot Scholarship Close]
             |                                     |
   [Instant Enrollment Contract]         [Instant Enrollment Contract]
```

### 5. Risk Assessment & Mitigation

| Business Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Sales Rep Shortage**: More students than reps in demo hall. | Medium | Moderate | Dynamic ratio fallback: allocates 1:2 or 1:3 rooms automatically if rep pool is constrained. |
| **Parent Technology Hesitancy**: Difficult device setup. | Low | High | Web-first zero-install architecture running entirely in modern web browsers without extensions. |
| **Regulatory Privacy Concerns**: Audio/video recording compliance. | Low | Critical | Local edge processing, zero third-party data tracking, explicit consent banners. |
