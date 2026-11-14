# CRM-4 Marketing & Engagement — UI Consistency & Wireframe Specification

**Module**: `frontend/src/modules/crm4/` (`id: 'crm4'`, `title: 'Marketing'`)  
**Allowed Roles**: `['admin', 'sales']`  
**Backend Service**: `services/crm4` (Port `5104`, Database `crm4_db`)  
**Workflow Position**: Step 1 of 9 (Marketing Campaigns, Web Inquiries & Customer Feedback Surveys)  
**Issue**: `[CRM4-R3] UI owner: Wireframes and screen consistency`  
**Owner / Assignee**: UI Owner (`@juitawde`)

---

## 1. Master Wireframe Inventory

All 8 screens belonging to Team CRM-4 have dedicated vector SVG wireframes and comprehensive markdown specifications in `docs/crm4/wireframes/`:

| Page Component | Route(s) | Sidebar Label | Allowed Roles | SVG Wireframe | Markdown Specification | Associated Issue |
|---|---|---|---|---|---|---|
| `CampaignsPage.jsx` | `/crm4`, `/crm4/campaigns` | `Campaigns` | `admin`, `sales` | [`campaigns.svg`](./campaigns.svg) | [`Campaigns.md`](./Campaigns.md) | `[CRM4-A2]`, `[CRM4-A3]` |
| `AudiencesPage.jsx` | `/crm4/audiences` | `Audiences` | `admin`, `sales` | [`audiences.svg`](./audiences.svg) | [`Audiences.md`](./Audiences.md) | `[CRM4-B2]` |
| `AudienceDetailPage.jsx` | `/crm4/audiences/:id` | *(detail view)* | `admin`, `sales` | [`audience-detail.svg`](./audience-detail.svg) | [`AudienceDetail.md`](./AudienceDetail.md) | `[CRM4-B2]`, `[CRM4-B3]` |
| `EnquiryPage.jsx` | `/crm4/enquiry` | `Web Enquiry` | `admin`, `sales` | [`enquiry.svg`](./enquiry.svg) | [`Enquiry.md`](./Enquiry.md) | `[CRM4-B4]` (New) |
| `TemplatesPage.jsx` | `/crm4/templates` | `Templates` | `admin`, `sales` | [`templates.svg`](./templates.svg) | [`Templates.md`](./Templates.md) | `[CRM4-C2]`, `[CRM4-C3]` |
| `SurveysPage.jsx` | `/crm4/surveys` | `Surveys` | `admin`, `sales` | [`surveys.svg`](./surveys.svg) | [`Surveys.md`](./Surveys.md) | `[CRM4-D2]` |
| `SurveyRespondPage.jsx` | `/crm4/surveys/:id/respond` | *(action view)* | `admin`, `sales` | [`survey-respond.svg`](./survey-respond.svg) | [`SurveyRespond.md`](./SurveyRespond.md) | `[CRM4-D2]` |
| `SurveyResultsPage.jsx` | `/crm4/surveys/:id/results` | *(analytics view)* | `admin`, `sales` | [`survey-results.svg`](./survey-results.svg) | [`SurveyResults.md`](./SurveyResults.md) | `[CRM4-D3]` |

---

## 2. Shared Shell & Router Integration

The shared monorepo architecture (`frontend/src/App.jsx`) dynamically mounts each team module via `import.meta.glob('./modules/*/index.jsx')`. To preserve global cohesion, CRM-4 adheres to the following rules:

1. **No Standalone Router or Navbar**: CRM-4 components must never import or initialize `<BrowserRouter>`, `<Routes>`, or standalone navigation headers. All routing is declared in `frontend/src/modules/crm4/index.jsx`.
2. **Path Prefixing**: All paths are relative to module `id: 'crm4'`. For example, `campaigns` resolves to `/crm4/campaigns`.
3. **Role Enforcement**: Every CRM-4 route is guarded with `roles: ['admin', 'sales']`.
4. **API Helper Only**: All backend communication uses the shared helper:
   ```javascript
   import { api } from '../../../api';
   // Example calls:
   const campaigns = await api('crm4', '/api/campaigns');
   const segments  = await api('crm3', '/api/segments');
   const products  = await api('erp1', '/api/products');
   ```
   **Zero direct `fetch(` calls or hardcoded `localhost` URLs are permitted.**

---

## 3. Standard Page Structure Template

Every CRM-4 page follows a consistent, accessible layout inside `<main className="page-container">`:

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function StandardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. Page Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Page Title
          </h2>
          <span className="badge badge-blue">CRM-4</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn">Primary Action</button>
        </div>
      </div>

      {/* 2. Notification Banners */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}
      {notification && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', border: '1px solid #86efac' }}>
          {notification}
        </div>
      )}

      {/* 3. Loading & Empty States */}
      {loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>}
      {!loading && items.length === 0 && (
        <div style={{ padding: '2.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          No records found.
        </div>
      )}

      {/* 4. Data Table */}
      {!loading && items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.id}</span></td>
                <td>{row.name}</td>
                <td><span className="badge badge-green">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## 4. Shared Design Tokens & Color Palette

Aligned across all 11 teams in `frontend/src/index.css`:

| Token Name | Hex Code | Visual Sample | Usage in CRM-4 |
|---|---|---|---|
| **Text Primary** | `#0f172a` | `rgb(15, 23, 42)` | Main headings, table body text, primary labels |
| **Text Muted** | `#64748b` | `rgb(100, 116, 139)` | Subtitles, helper text, empty state description |
| **Border Default** | `#e2e8f0` | `rgb(226, 232, 240)` | Card borders, table dividers |
| **Input Border** | `#cbd5e1` | `rgb(203, 213, 225)` | Form input borders |
| **Background Neutral**| `#f8fafc` | `rgb(248, 250, 252)` | Table headers, form card backgrounds |
| **Card White** | `#ffffff` | `rgb(255, 255, 255)` | Data tables, form input fields, modal boxes |
| **Primary Blue** | `#2563eb` | `rgb(37, 99, 235)` | Primary action buttons, active navigation states |
| **Primary Hover** | `#1d4ed8` | `rgb(29, 78, 216)` | Hover background for primary buttons |
| **Success Green** | `#16a34a` / `#15803d` | `rgb(22, 163, 74)` | Promoters, sent campaigns, reachable members, success banners |
| **Warning Amber** | `#d97706` / `#b45309` | `rgb(217, 119, 6)` | Draft campaigns, passives, dealer inquiries, SMS channel |
| **Danger Red** | `#dc2626` / `#b91c1c` | `rgb(220, 38, 38)` | Detractors, opted-out subscribers, 502 error banners |

---

## 5. Badge Classes & Semantics (Global CSS)

Badge classes from `frontend/src/index.css` are used with `<span className="badge badge-<color>">`:

- **`.badge-green`**:
  - Campaigns: `sent`
  - Audiences: `Reachable` / `Active`
  - Surveys: `csat` type, Promoters (scores 9-10)
  - Inquiry Source: `walk-in`
  - Channel: `whatsapp`
- **`.badge-blue`**:
  - Module Tag: `CRM-4`
  - Campaigns: `scheduled`
  - Channel: `email`
  - Surveys: `nps` type
  - Inquiry Source: `web`
- **`.badge-amber`**:
  - Campaigns: `draft`
  - Channel: `sms`
  - Surveys: Passives (scores 7-8)
  - Inquiry Source: `dealer`
- **`.badge-red`**:
  - Audiences: `Opted Out`
  - Surveys: Detractors (scores 0-6)
  - Validation: Character limit exceeded, error notices

---

## 6. Table, Form & Button Conventions

1. **Tables**:
   - Clean border collapse, background white, border `#e2e8f0`.
   - Table header background `#f8fafc` with uppercase muted text (`#64748b`, font size `0.75rem`, letter spacing `0.05em`).
   - Monospace font (`fontFamily: 'monospace'`) for entity identifiers (`CMP-xxxx`, `AUD-xxxx`, `ENQ-xxxx`, `TPL-xxxx`, `SRV-xxxx`, `CUST-xxxx`, `SKU-xxxx`, `EMP-xxxx`).
2. **Forms & Cards**:
   - Form containers use card styling (`#f8fafc` background, `#e2e8f0` border, `8px` border radius, `1.5rem` padding).
   - Form fields include label with asterisk for required inputs.
   - Text inputs, selects, and textareas use border `#cbd5e1`, padding `0.55rem 0.75rem`, border radius `6px`.
3. **Buttons**:
   - Primary buttons: background `#2563eb`, white text, hover `#1d4ed8`.
   - Secondary / Outline buttons: background `#ffffff`, border `#cbd5e1`, text `#334155`.
   - Danger buttons: background `#fee2e2`, text `#b91c1c`, border `#fca5a5`.

---

## 7. Currency, Date & Entity ID Formatting

- **Indian Rupee (INR)**:
  Format currency amounts using standard Indian grouping with a ₹ sign and `toLocaleString('en-IN')`:
  ```javascript
  const formatMoney = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  // Example: (55000).toLocaleString('en-IN') => "55,000"
  ```
- **Dates**: Standard ISO `YYYY-MM-DD` or friendly localized format:
  ```javascript
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  ```
- **Shared Cross-Team Entity IDs**:
  - Customers: `CUST-0001` through `CUST-0008` (from CRM-3)
  - Products / SKUs: `SKU-0001` through `SKU-0015` (from ERP-1)
  - Employees / Sales Reps: `EMP-0001` through `EMP-0004` (from ERP-6)
  - Segments: `SEG-0001` through `SEG-0004` (from CRM-3)
  - All IDs rendered in `fontFamily: 'monospace'` with weight `600`.

---

## 8. Print Stylesheet Standards

The shared shell in `frontend/src/index.css` defines the baseline print media query:

```css
@media print {
  .sidebar,
  .top-bar,
  button,
  .btn,
  .no-print {
    display: none !important;
  }
  .main-content,
  .page-container {
    padding: 0 !important;
    margin: 0 !important;
  }
}
```

For printable reporting views—specifically `SurveyResultsPage.jsx` (`/crm4/surveys/:id/results`)—the layout is styled to fit cleanly on a single A4 portrait page, ensuring that headers, distribution bars, and verified customer comments format elegantly for executive reviews and presentations.

---

## 9. Module Route Registry (`frontend/src/modules/crm4/index.jsx`)

The module configuration in `frontend/src/modules/crm4/index.jsx` registers all 8 pages:

```javascript
import React from 'react';
import CampaignsPage from './pages/CampaignsPage';
import AudiencesPage from './pages/AudiencesPage';
import AudienceDetailPage from './pages/AudienceDetailPage';
import EnquiryPage from './pages/EnquiryPage';
import TemplatesPage from './pages/TemplatesPage';
import SurveysPage from './pages/SurveysPage';
import SurveyRespondPage from './pages/SurveyRespondPage';
import SurveyResultsPage from './pages/SurveyResultsPage';

export default {
  id: 'crm4',
  title: 'Marketing',
  roles: ['admin', 'sales'],
  routes: [
    {
      path: '',
      element: <CampaignsPage />
    },
    {
      path: 'campaigns',
      label: 'Campaigns',
      element: <CampaignsPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'audiences',
      label: 'Audiences',
      element: <AudiencesPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'audiences/:id',
      element: <AudienceDetailPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'enquiry',
      label: 'Web Enquiry',
      element: <EnquiryPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'templates',
      label: 'Templates',
      element: <TemplatesPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys',
      label: 'Surveys',
      element: <SurveysPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys/:id/respond',
      element: <SurveyRespondPage />,
      roles: ['admin', 'sales']
    },
    {
      path: 'surveys/:id/results',
      element: <SurveyResultsPage />,
      roles: ['admin', 'sales']
    }
  ]
};
```

Only primary directory views (`Campaigns`, `Audiences`, `Web Enquiry`, `Templates`, `Surveys`) provide a `label` property, keeping the sidebar uncluttered while contextual detail views (`/audiences/:id`, `/surveys/:id/respond`, `/surveys/:id/results`) remain accessible via direct routing and page-level action buttons.

---

## 10. UI Consistency Checklist

Before any PR touches the CRM-4 frontend:
- [x] All 8 required wireframe SVGs exist in `docs/crm4/wireframes/` with valid `<svg>` tags and `viewBox`.
- [x] All 8 companion markdown specifications exist with ASCII wireframes and behavioral details.
- [x] `UI-CONSISTENCY.md` documents design tokens, badges, table styles, print rules, and route registries.
- [x] Route registration in `frontend/src/modules/crm4/index.jsx` registers all 8 routes under role `['admin', 'sales']`.
- [x] No custom `<BrowserRouter>`, `<Routes>`, or standalone navigation components are introduced.
- [x] Zero hardcoded `localhost:5104` or raw `fetch(` calls; all API queries use `api('crm4', ...)`.
- [x] Standard feedback states implemented: Loading state, Empty state, Error alert banner, Success banner.
- [x] Badges conform to color semantics: `sent`/`reachable`/`promoter` (green), `scheduled`/`email` (blue), `draft`/`sms`/`passive` (amber), `opted-out`/`detractor` (red).
- [x] Print stylesheet suppresses `.sidebar`, `.top-bar`, and action buttons cleanly.
