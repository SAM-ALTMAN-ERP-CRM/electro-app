# Wireframe: Opportunity Pipeline Board
**Route**: `/crm1/pipeline`  
**Issues**: CRM1-B1, CRM1-B2, CRM1-B3  
**Roles**: `admin`, `sales`

---

## Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    > Leads                       │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Pipeline         ←active    │  │ Active Workspace: Sales (CRM-1)        Role: [sales]    │  │
│    > Quotes                      │  │                                        User: Rajesh K.  │  │
│    > New Quote                   │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers                     │                                                               │
│    > Approvals (admin)           │  Opportunity Pipeline Board                                   │
│                                  │  Total Pipeline Value: ₹2,89,920.00                           │
│                                  │                                                               │
│                                  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────┐ ┌──────┐  │
│                                  │  │ PROSPECT  │ │ PROPOSAL  │ │NEGOTIATION│ │ WON  │ │ LOST │  │
│                                  │  │ (1)       │ │ (1)       │ │ (1)       │ │ (1)  │ │ (1)  │  │
│                                  │  │ ₹51,980   │ │ ₹67,960   │ │ ₹1,12,980 │ │ ₹45K │ │ ₹12K │  │
│                                  │  ├───────────┤ ├───────────┤ ├───────────┤ ├──────┤ ├──────┤  │
│                                  │  │ OPP-0001  │ │ OPP-0002  │ │ OPP-0003  │ │ ...  │ │ ...  │  │
│                                  │  │ Smart TV  │ │ Bulk App. │ │ OLED Home │ │      │ │      │  │
│                                  │  │ CUST-0001 │ │ CUST-0004 │ │ CUST-0003 │ │      │ │      │  │
│                                  │  │ ₹51,980   │ │ ₹67,960   │ │ ₹1,12,980 │ │      │ │      │  │
│                                  │  │ [Move →]  │ │ [Move →]  │ │ [Move →]  │ │      │ │      │  │
│                                  │  └───────────┘ └───────────┘ └───────────┘ └──────┘ └──────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header & Summary Metrics**:
   - Title: `Opportunity Pipeline Board`
   - Subtitle: `Visualize active deals across sales stages and track expected revenues in INR.`
   - Aggregate metrics summary: Total Pipeline Value, Open Opportunities count, Won count.
2. **5-Column Progression Columns**:
   - **Prospect** (Blue): Initial discovery stage
   - **Proposal** (Purple): Quotation sent to customer
   - **Negotiation** (Amber): Reviewing commercial terms and discounts
   - **Won** (Green): Deal closed with accepted quotation
   - **Lost** (Red): Unsuccessful deal
3. **Column Headers**:
   - Stage Name and color-coded top accent bar
   - Card count badge
   - Column total value calculated dynamically in `₹` format.
4. **Card Details**:
   - `Opportunity ID` (`OPP-xxxx`)
   - `Deal Title`
   - `Customer ID` (`CUST-0001` to `CUST-0008`)
   - `Lead Reference` (`LEAD-xxxx`)
   - `Expected Value`: Formatted as INR currency (`₹51,980`)
   - `Sales Rep`: Assignment tag (`EMP-0001`)
   - `Move to next stage`: Action button progressing the opportunity to the immediate next stage without drag-and-drop complexity.
5. **Stage Rules**:
   - Deals progress strictly sequentially: Prospect $\rightarrow$ Proposal $\rightarrow$ Negotiation $\rightarrow$ Won.
   - Any stage can transition directly to `Lost`.
