# Wireframe Specification: Message Templates Studio

**Route**: `/crm4/templates`  
**Issues**: `[CRM4-C2]`, `[CRM4-C3]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/templates.svg`](./templates.svg)

---

## 1. Purpose & Overview

The **Message Templates Studio** provides marketing teams with a multi-channel template authoring environment supporting `email`, `whatsapp`, and `sms`. Key capabilities include:
1. Managing pre-configured message templates (`TPL-0001`..`TPL-0004`).
2. Dynamic placeholder insertion chips for `{{name}}`, `{{product}}`, and `{{offer}}`.
3. Strict SMS validation with a live character counter enforcing the 160-character cellular payload limit (`[CRM4-C3]`).
4. Unknown placeholder detection (e.g. warning when `{{abc}}` is typed).
5. Real-time split-pane live render preview demonstrating the final synthesized message delivered to customers.

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Message Templates                                          [CRM-4]                     │
│ Author multi-channel templates with placeholders & live render preview                 │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ┌── Templates List ──────────────────────────────────────────────────────────────────┐ │
│ │ ID       NAME           CHANNEL   SUBJECT / SNIPPET                 LENGTH ACTIONS │ │
│ │────────────────────────────────────────────────────────────────────────────────────│ │
│ │ TPL-0001 Launch Notice  [whatsapp] Hi {{name}}! Check out {{product}} 84 ch  Edit   │ │
│ │ TPL-0002 Festive Offer  [email]    Subject: Exclusive {{offer}}...    195 ch Edit   │ │
│ │ TPL-0003 Warranty Care  [sms]      Dear {{name}}, extend warranty...  95/160 Edit   │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Template Editor ───────────────────────┐ ┌── 📱 Live Message Render Preview ─────┐ │
│ │ Template Name: [ Warranty Care SMS     ] │ │ SAMPLE SUBSTITUTION VALUES:           │ │
│ │ Channel:       [ SMS (160 char limit) ▼] │ │ {{name}}: Aarav Mehta                 │ │
│ │                                          │ │ {{product}}: Smart LED TV 55"         │ │
│ │ Insert Placeholders:                     │ │ {{offer}}: Festive 15% Off            │ │
│ │ [+ {{name}}] [+ {{product}}] [+ {{offer}}]│ │                                       │ │
│ │                                          │ │ ┌── SMS from: ELECTRO-CARE ─────────┐ │ │
│ │ Body: *                                  │ │ │ Dear Aarav Mehta, extend warranty │ │ │
│ │ ┌──────────────────────────────────────┐ │ │ │ for your Smart LED TV 55" today!  │ │ │
│ │ │ Dear {{name}}, extend warranty for   │ │ │ │ Avail our exclusive Festive 15%   │ │ │
│ │ │ your {{product}} today! Avail our    │ │ │ │ Off. Call 1800-ELECTRO.           │ │ │
│ │ │ exclusive {{offer}}...               │ │ │ └───────────────────────────────────┘ │ │
│ │ └──────────────────────────────────────┘ │ │                                       │ │
│ │ Char Count: 114 / 160 (Within Limit)     │ │ [✓ Placeholder Validation Passed]     │ │
│ │ [ Save Template ] [ Reset ]              │ │ No unknown tokens detected.           │ │
│ └──────────────────────────────────────────┘ └───────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Template Table
- Lists all saved templates with channel badge:
  - `email`: `.badge-blue`
  - `whatsapp`: `.badge-green`
  - `sms`: `.badge-amber`
- Length indicator: highlights SMS length in green (`< 160`) or red (`> 160`).

### 3.2 Editor Form
- **Template Name**: Text input.
- **Channel**: Select (`email`, `whatsapp`, `sms`).
  - When `whatsapp` is selected, the `Subject` field is hidden.
  - When `email` or `sms` is selected, `Subject` is shown.
- **Placeholder Chips**: Buttons that insert `{{name}}`, `{{product}}`, or `{{offer}}` at the cursor position.
- **Character Counter**: Real-time counter for SMS bodies (max 160 characters).
- **Validation**: Displays warning if unknown placeholders like `{{discount}}` are entered.

### 3.3 Live Render Preview (`[CRM4-C3]`)
- Updates in real time as the user types.
- Replaces tokens with standard sample values:
  - `{{name}}` &rarr; `Aarav Mehta`
  - `{{product}}` &rarr; `Smart LED TV 55"`
  - `{{offer}}` &rarr; `Festive 15% Off`
- Renders simulated message bubble matching the selected channel's styling.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Exceeding SMS Limit** | Character counter turns red (`172 / 160`), save button disabled or displays confirmation modal. |
| **Unknown Placeholder** | Amber alert chip: `⚠️ Unknown placeholder {{code}} detected. Supported tokens are {{name}}, {{product}}, {{offer}}.` |
| **Saving** | Button text: `"Saving Template..."` |
| **Success** | Green banner confirming template saved or updated. |
