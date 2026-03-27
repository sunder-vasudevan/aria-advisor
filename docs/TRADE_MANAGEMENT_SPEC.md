# ARIA Trade Management Module — Specification

**Version:** 1.0
**Date:** 2026-03-27
**Status:** Design Locked, Awaiting Implementation
**Owner:** Sunny Hayes Vasudevan

---

## 1. Overview

**Problem:** ARIA advisors can't execute trades on behalf of clients. They can analyze portfolios, run scenarios, and recommend changes — but the entire trade execution flow is manual, offline, and untracked.

**Solution:** Build a Trade Management Module that lets advisors **propose** trades → clients **approve** → system **tracks** execution and settlement.

**Why Now:** Enables end-to-end advisee relationship — from discovery (Client 360) → planning (goals/scenarios) → action (trades) → settlement (ARIA Personal).

---

## 2. Execution Model

### High-Level Flow

```
ARIA Advisor App                ARIA Personal App              Backend/Banking
─────────────────────          ────────────────              ──────────────

Advisor initiates trade
(Buy 0.5 BTC, Sell 100 MF)
            │
            ├─→ Trade created as DRAFT
            │
            ├─→ Advisor clicks "Submit"
            │   Status: PENDING_APPROVAL
            │
            │                 Client notified
            │                 (notification)
            │
            │                 Client reviews
            │                 trade details
            │
            │                 Client clicks
            │                 "Approve"
            │
            │     ←─────────── Client approved
            │                   Status: APPROVED
            │
            │                                   Backend:
            │                                   - Log audit event
            │                                   - Mock debit/credit
            │                                   - Update holdings
            │                                   - Mark SETTLED
            │
            │     ←───────────────────────────── Trade settled
            │                                    notification
```

### Asset Classes Covered

#### Mutual Funds (Phase 1)
- **Execution:** Advisor initiates → Client approves → Backend mocks debit/credit → Status SETTLED
- **Assumption:** MF trades settle same-day in Phase 1 (mock)
- **Phase 2:** Real mutual fund APIs (Smallcase, BSE) will auto-execute and provide real NAV
- **Holdings Update:** On settlement, add new Holding or update existing quantity

#### Cryptocurrency (Phase 1) — "Trades on External Wallet Only"
- **Execution:** Advisor initiates → Client approves in ARIA Personal → Client manually executes on external wallet (Coinbase, Kraken, MetaMask) → (Optional) Client submits tx hash
- **Why External:** No custody risk; client retains control; easy UX for crypto-native users
- **ARIA's Role:** Proposes trade, tracks approval, provides instructions; doesn't touch client's crypto
- **Northstar A (Phase 2+):** Integrate wallet APIs to auto-execute and auto-settle
- **Holdings Tracking:** ARIA doesn't track crypto holdings in Phase 1; Phase 2 will add crypto portfolio support

**Detailed Plan: "Trades on External Wallet Only"**

**What it means:**
- ARIA is a **planner & tracker**, not an **executor**
- Advisor proposes "Buy 0.5 BTC @ ₹18,000" in ARIA Advisor
- Client approves in ARIA Personal
- Client then goes to their own wallet/exchange (Coinbase, Kraken, MetaMask, WazirX, CoinDCX, etc.) and executes the buy
- ARIA logs the approval + settlement but never calls a blockchain or exchange API
- Optional: Client can paste the tx hash into ARIA for record-keeping (compliance proof)

**Why this approach for Phase 1:**

| Aspect | Why External Wallet |
|--------|-------------------|
| **Speed to market** | No wallet API integration needed (MetaMask, WalletConnect, Coinbase SDK are complex) |
| **Custody risk** | Zero. Client's crypto stays on client's exchange/wallet. ARIA never has keys or tokens. |
| **Regulatory** | Lighter touch. ARIA advises; client executes. Clear separation of advisor role vs. custodian role. |
| **UX** | Clients already use Coinbase/Kraken/MetaMask daily. No new login, no new interface to learn. |
| **Audit trail** | Full compliance: trade proposal in ARIA → client approval in ARIA → client's own tx hash → all logged. |
| **Scope creep** | No blockchain infrastructure, no wallet key management, no exchange integrations. Phase 1 stays simple. |

**Northstar A Vision (Phase 2+):**
Once ARIA's trade workflow is battle-tested, integrate wallet APIs:
- MetaMask (Ethereum, Polygon, BSC)
- WalletConnect (universal protocol, multi-chain)
- Coinbase API (CoinbaseAPI Wallet, Exchange)
- WazirX / CoinDCX APIs (India-first crypto exchanges)
- Then: Client clicks "Execute" in ARIA Personal → auto-calls exchange API → trade executes on-chain → tx hash auto-captured → settled

**Client Journey (Phase 1):**

```
1. ARIA Advisor (Advisor side)
   ├─ Advisor: "I want to suggest crypto for Priya"
   ├─ Form: Buy / BTC / 0.5 units / ₹18,000 est. value
   ├─ Submit: Trade pending approval
   └─ Notif: Priya, review this trade

2. ARIA Personal (Client side)
   ├─ Priya: "Pending trade from my advisor Rahul"
   ├─ Card: "Buy 0.5 BTC @ ₹18,000"
   ├─ She reads: "Rahul recommended this as a 5% portfolio hedge"
   ├─ Click: "Approve"
   └─ Notif: "Trade approved! ✅ Next: Coinbase"

3. Client's External Wallet (outside ARIA)
   ├─ Priya: Opens Coinbase app
   ├─ Buys: 0.5 BTC (her own funds from bank account she linked to Coinbase)
   ├─ Sees: tx hash "0x1234..."
   └─ Copy tx hash to clipboard

4. ARIA Personal (back to ARIA)
   ├─ Priya: Returns to "Pending Trades" section
   ├─ Clicks: "Verify Execution" (or "Submit tx hash")
   ├─ Pastes: "0x1234..." (optional)
   ├─ ARIA logs: Execution verified, trade marked SETTLED
   └─ Notif: Rahul, "Priya executed the trade ✅"

5. ARIA Advisor (Advisor side — view only)
   ├─ Rahul: Client 360 → Trades tab
   ├─ Sees: Trade SETTLED, client submitted tx hash
   ├─ Audit log: Full trail (proposed → approved → executed)
   └─ Notes: For his records + compliance
```

**UX Copy in ARIA Personal (on approval):**

For Crypto trade:
> ✅ **Trade Approved!**
>
> Your advisor Rahul's proposal is approved. Now it's your turn:
>
> **Next Step:**
> 1. Open your crypto wallet or exchange (Coinbase, Kraken, MetaMask, WazirX, CoinDCX)
> 2. Execute the trade: **Buy 0.5 BTC**
> 3. Once done, come back here and paste the transaction hash (optional, but helps us track execution)
>
> **Don't have crypto yet?** [Learn how to set up a wallet](link-to-guide)
>
> **Questions?** [Chat with Rahul](link-to-copilot)

**Audit Trail & Compliance:**

```
Trade ID: trade-uuid
Status progression:
├─ DRAFT (2026-03-27 10:30) — Rahul created trade
├─ PENDING_APPROVAL (2026-03-27 10:40) — Rahul submitted
├─ APPROVED (2026-03-27 11:15) — Priya approved, comment: "Looks good"
├─ SETTLED (2026-03-27 11:45) — Client provided tx hash: 0x1234...
└─ Compliance notes: Priya executed on external wallet; ARIA has no custody; full client control

Immutable log entries:
├─ [10:30] Event: CREATED | Actor: Rahul (advisor)
├─ [10:40] Event: SUBMITTED | Actor: Rahul (advisor)
├─ [11:15] Event: APPROVED | Actor: Priya (client) | Note: "Looks good"
└─ [11:45] Event: SETTLED | Actor: Priya (client) | Note: "Tx verified: 0x1234..."
```

**Why This Works Better Than Alternatives:**

| Alternative | Why Not |
|------------|---------|
| **ARIA holds crypto keys** | ❌ Custody liability, regulatory complexity, hacking risk, not our core business |
| **ARIA auto-calls exchange API** | ❌ Phase 1 scope creep; 5+ exchange APIs to integrate; fragile; user onboarding complex |
| **ARIA custodies via 3rd party (Fireblocks, Copper)** | ❌ Cost + integration time; overkill for advisory workflow |
| **Client imports wallet into ARIA UI** | ❌ UX friction; users distrust sharing keys; defeats purpose of external custody |
| **Advice-only, no trade tracking** | ❌ Compliance risk; no audit trail; client forgets what was approved |
| **Phase 1: External wallet; Phase 2: Auto-exec** | ✅ **This is our path** |

**Phase 2 Implementation (Wallet APIs):**

When you're ready to auto-execute, the flow becomes:

```
Advisor proposes → Client approves → [NEW] Client clicks "Execute in ARIA"
  → ARIA calls MetaMask / Coinbase / WalletConnect API
  → User approves in wallet UI
  → Trade executes on-chain
  → tx hash auto-captured
  → ARIA marks SETTLED
```

Trade record **never changes**; only the "how we got there" changes (manual → automated).

**Summary for Phase 1:**
- Advisor = planner (creates trade proposals in ARIA)
- Client = executor (approves in ARIA, executes on own wallet, optionally shares proof)
- ARIA = compliance log (tracks everything, owns nothing)
- Northstar = Phase 2 auto-execution via wallet APIs (same trade workflow, just automated steps 3–5)

#### Parked (Phase 2+)
- Direct stocks (equity listing, complex tax lot tracking)
- Bonds (coupon, maturity, callable features)
- Insurance (life, health, unit-linked)
- Forex, commodities, derivatives

---

## 3. Data Model

### Trade Table

```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clients(id),
    advisor_id UUID NOT NULL REFERENCES advisors(id),

    -- Asset specification
    asset_type VARCHAR(20) NOT NULL,  -- 'mutual_fund' | 'crypto'
    action VARCHAR(10) NOT NULL,      -- 'buy' | 'sell'
    asset_code VARCHAR(50) NOT NULL,  -- ISIN for MF, ticker for crypto (BTC, ETH, etc.)
    asset_name VARCHAR(255),          -- Display name (e.g., "Bitcoin", "SBI Bluechip Fund")

    -- Trade terms
    quantity DECIMAL(18, 8) NOT NULL, -- Units or tokens (0.5 for 0.5 BTC, 100 for 100 MF units)
    estimated_value DECIMAL(18, 2),   -- Snapshot at creation (for reference/review)
    actual_value DECIMAL(18, 2),      -- Set at execution (actual price when settled)

    -- Status & Timeline
    status VARCHAR(20) NOT NULL,      -- draft | pending_approval | approved | settled | rejected | cancelled
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP,           -- When advisor submitted for approval
    approved_at TIMESTAMP,            -- When client approved
    executed_at TIMESTAMP,            -- When trade was executed
    settled_at TIMESTAMP,             -- When trade fully settled

    -- Commentary
    advisor_note TEXT,                -- Advisor's rationale (why this trade)
    client_comment TEXT,              -- Client's optional comment on approval
    rejection_reason TEXT,            -- Client's reason if rejected

    -- Audit
    created_by VARCHAR(50),           -- advisor email or id
    approved_by VARCHAR(50),          -- client email or id

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE NOW(),

    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_status_enum CHECK (status IN ('draft', 'pending_approval', 'approved', 'settled', 'rejected', 'cancelled')),
    CONSTRAINT chk_action_enum CHECK (action IN ('buy', 'sell')),
    CONSTRAINT chk_asset_type_enum CHECK (asset_type IN ('mutual_fund', 'crypto')),

    INDEX idx_client_id (client_id),
    INDEX idx_advisor_id (advisor_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_settled_at (settled_at DESC)
);
```

### TradeAuditLog Table (Immutable)

```sql
CREATE TABLE trade_audit_logs (
    id UUID PRIMARY KEY,
    trade_id UUID NOT NULL REFERENCES trades(id),

    -- Event
    event_type VARCHAR(50) NOT NULL, -- 'created' | 'submitted' | 'approved' | 'rejected' | 'executed' | 'settled' | 'cancelled'
    actor_type VARCHAR(20) NOT NULL, -- 'advisor' | 'client' | 'system'
    actor_id VARCHAR(100),           -- advisor/client email or system id

    -- Context
    note TEXT,                       -- Optional narrative (e.g., "Client approved at 10:30 AM")
    prev_status VARCHAR(20),         -- Status before this event
    new_status VARCHAR(20),          -- Status after this event

    -- Timestamp (immutable)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    INDEX idx_trade_id (trade_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at DESC),
    CONSTRAINT fk_trade_id FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);
```

---

## 4. API Specification

### Advisor Endpoints (ARIA Advisor App)

#### POST /clients/{client_id}/trades
**Create trade (draft)**
```json
Request:
{
  "asset_type": "mutual_fund",
  "action": "buy",
  "asset_code": "INF090I01041",
  "asset_name": "SBI Bluechip Fund",
  "quantity": 100,
  "estimated_value": 450000,
  "advisor_note": "Rebalance towards large-cap; client aligned on risk"
}

Response:
{
  "id": "trade-uuid",
  "client_id": "client-uuid",
  "advisor_id": "advisor-uuid",
  "asset_type": "mutual_fund",
  "action": "buy",
  "asset_code": "INF090I01041",
  "quantity": 100,
  "estimated_value": 450000,
  "status": "draft",
  "created_at": "2026-03-27T10:30:00Z",
  "advisor_note": "Rebalance towards large-cap; client aligned on risk"
}
```

#### PUT /trades/{trade_id}
**Update draft trade (before submission)**
```json
Request:
{
  "quantity": 150,
  "estimated_value": 675000,
  "advisor_note": "Increased allocation per client discussion"
}

Response:
{
  "id": "trade-uuid",
  "status": "draft",
  "quantity": 150,
  "estimated_value": 675000,
  "advisor_note": "Increased allocation per client discussion",
  "updated_at": "2026-03-27T10:35:00Z"
}
```

#### POST /trades/{trade_id}/submit
**Submit trade for client approval**
```json
Request: {}

Response:
{
  "id": "trade-uuid",
  "status": "pending_approval",
  "submitted_at": "2026-03-27T10:40:00Z",
  "message": "Trade submitted. Client will be notified."
}
```

#### DELETE /trades/{trade_id}
**Cancel draft trade (advisor)**
```json
Response: { "status": "cancelled", "cancelled_at": "2026-03-27T10:45:00Z" }
```

#### GET /clients/{client_id}/trades
**List all trades for a client (paginated)**
```json
Response:
{
  "trades": [
    { "id": "trade-1", "asset_code": "INF090I01041", "status": "settled", "settled_at": "2026-03-26T14:00:00Z" },
    { "id": "trade-2", "asset_code": "BTC", "status": "pending_approval", "submitted_at": "2026-03-27T10:40:00Z" }
  ],
  "total": 2,
  "page": 1
}
```

#### GET /trades/{trade_id}
**Get full trade details + audit trail**
```json
Response:
{
  "id": "trade-uuid",
  "client_id": "client-uuid",
  "advisor_id": "advisor-uuid",
  "asset_type": "mutual_fund",
  "action": "buy",
  "asset_code": "INF090I01041",
  "quantity": 100,
  "estimated_value": 450000,
  "actual_value": 448500,
  "status": "settled",
  "created_at": "2026-03-27T10:30:00Z",
  "submitted_at": "2026-03-27T10:40:00Z",
  "approved_at": "2026-03-27T11:15:00Z",
  "settled_at": "2026-03-27T11:30:00Z",
  "advisor_note": "Rebalance towards large-cap",
  "client_comment": "Looks good, agreed with my timeline",
  "audit_logs": [
    { "event_type": "created", "actor_type": "advisor", "created_at": "2026-03-27T10:30:00Z", "note": "Trade created" },
    { "event_type": "submitted", "actor_type": "advisor", "created_at": "2026-03-27T10:40:00Z", "note": "Submitted for approval" },
    { "event_type": "approved", "actor_type": "client", "created_at": "2026-03-27T11:15:00Z", "note": "Client approved" },
    { "event_type": "settled", "actor_type": "system", "created_at": "2026-03-27T11:30:00Z", "note": "Trade settled; mock debit applied" }
  ]
}
```

---

### Client Endpoints (ARIA Personal App)

#### GET /me/pending-trades
**Get pending trades awaiting client approval**
```json
Response:
{
  "pending_trades": [
    {
      "id": "trade-uuid",
      "advisor_id": "advisor-uuid",
      "advisor_name": "Rahul Nair",
      "asset_type": "mutual_fund",
      "action": "buy",
      "asset_name": "SBI Bluechip Fund",
      "quantity": 100,
      "estimated_value": 450000,
      "advisor_note": "Rebalance towards large-cap",
      "submitted_at": "2026-03-27T10:40:00Z"
    }
  ]
}
```

#### POST /trades/{trade_id}/approve
**Client approves trade**
```json
Request:
{
  "comment": "Looks good, agreed with my timeline"
}

Response:
{
  "id": "trade-uuid",
  "status": "approved",
  "approved_at": "2026-03-27T11:15:00Z",
  "client_comment": "Looks good, agreed with my timeline",
  "message": "Trade approved! Your advisor will process this now."
}
```

#### POST /trades/{trade_id}/reject
**Client rejects trade**
```json
Request:
{
  "reason": "I need to wait for my bonus before investing more"
}

Response:
{
  "id": "trade-uuid",
  "status": "rejected",
  "rejection_reason": "I need to wait for my bonus before investing more",
  "message": "Trade rejected. Your advisor has been notified."
}
```

#### GET /me/trades
**Get all trades (history + pending)**
```json
Response:
{
  "trades": [
    { "id": "trade-1", "status": "settled", "asset_name": "SBI Bluechip", "settled_at": "..." },
    { "id": "trade-2", "status": "pending_approval", "asset_name": "Bitcoin", "submitted_at": "..." }
  ]
}
```

#### GET /trades/{trade_id}
**Get full trade details (client view)**
```json
Response:
{
  "id": "trade-uuid",
  "advisor_name": "Rahul Nair",
  "asset_type": "mutual_fund",
  "action": "buy",
  "asset_name": "SBI Bluechip Fund",
  "quantity": 100,
  "estimated_value": 450000,
  "status": "pending_approval",
  "advisor_note": "Rebalance towards large-cap; client aligned on risk",
  "submitted_at": "2026-03-27T10:40:00Z",
  "audit_logs": [...]
}
```

---

## 5. Execution Flow (Detailed)

### Mutual Fund Trade (Phase 1)

```
1. Advisor initiates trade in ARIA Advisor
   - Form: Asset type (MF) → Action (Buy) → Fund (SBI Bluechip) → Quantity (100) → Estimated value (450k)
   - API: POST /clients/{id}/trades
   - Status: DRAFT
   - Advisor can edit or delete at this stage

2. Advisor submits for approval
   - API: POST /trades/{id}/submit
   - Status: PENDING_APPROVAL
   - Backend: Create notification record for client

3. Client receives notification (Phase 2: email, SMS, push)
   - ARIA Personal: Pending Trades section shows trade card
   - Client reviews: Asset, quantity, value, advisor's rationale

4. Client approves or rejects
   - Approve API: POST /trades/{id}/approve
   - Status: APPROVED
   - Backend: Trigger settlement process

5. Backend settlement (mock in Phase 1)
   - Log audit event: "Trade approved"
   - Mock debit on client's bank account (no real API call)
   - Update holdings: Add/update Holding row with new quantity
   - Log audit event: "Trade settled"
   - Status: SETTLED
   - Backend: Send notification to advisor + client

6. Both sides see updated state
   - ARIA Advisor: Client 360 → Trades tab shows settled trade, holdings updated
   - ARIA Personal: Trade marked SETTLED, holdings updated
```

### Cryptocurrency Trade (Phase 1)

```
1. Advisor initiates trade in ARIA Advisor
   - Form: Asset type (Crypto) → Action (Buy) → Asset (BTC) → Quantity (0.5) → Estimated value (₹18,000 at 36k/BTC)
   - Status: DRAFT
   - API: POST /clients/{id}/trades

2. Advisor submits for approval
   - API: POST /trades/{id}/submit
   - Status: PENDING_APPROVAL
   - Client notified

3. Client reviews in ARIA Personal
   - Sees: "Buy 0.5 BTC @ ₹18,000 (est.) from Rahul Nair"
   - Reads advisor note

4. Client approves
   - API: POST /trades/{id}/approve
   - Status: APPROVED
   - Backend: Mock debit (log, no real API)
   - Status: SETTLED (client will handle actual execution)
   - Notification: "Trade approved! Next: Go to Coinbase/Kraken and execute this buy. Share the tx hash when done (optional)."

5. Client's manual action (outside ARIA)
   - Client logs into Coinbase or their wallet
   - Buys 0.5 BTC using their own funds (already mock-debited from ARIA's banking layer)
   - Gets tx hash from exchange

6. (Optional) Client submits proof
   - ARIA Personal: Trade card shows "Submit Tx Hash" button
   - Client pastes: "0x1234567890abcdef..."
   - ARIA logs the hash in audit trail for compliance
   - Trade marked as "execution verified"

7. Holdings tracking
   - Phase 1: ARIA doesn't track crypto holdings; no portfolio update
   - Phase 2: Integrate wallet APIs to fetch crypto balance + auto-update holdings
```

---

## 6. Notifications

### Client Notifications
- **On Trade Submission:** "Rahul initiated a trade: Buy 100 units of SBI Bluechip (₹450k). Review & approve in ARIA Personal."
- **On Approval (to advisor):** "Your client Priya approved the trade. Amount debited; trade now settled."
- **On Rejection (to advisor):** "Your client rejected the trade. See reason in ARIA Advisor."

### Advisor Notifications
- **On Client Approval:** "Priya approved your trade. Trade now settled."
- **On Client Rejection:** "Priya rejected your trade."

**Phase 2:** Integrate Twilio / Mailgun / SendGrid for email/SMS/WhatsApp delivery.

---

## 7. Compliance & Audit

### Immutable Audit Trail
Every trade action is logged in `TradeAuditLog`:
- Trade creation
- Submission (advisor)
- Approval/Rejection (client)
- Settlement (system)
- Cancellation

### Regulatory Compliance
- **SEBI Suitability:** Advisor is responsible for recommending suitable products (ARIA doesn't validate in Phase 1)
- **Execution Record:** Every trade creation, approval, settlement is timestamped and immutable
- **7-Year Retention:** TradeAuditLog records retained per Indian financial regulations
- **Client Consent:** Optional client comment on approval serves as manual consent record

### Reporting
- **For Compliance Officer:** `GET /trades?status=settled&date_range=2026-01-01:2026-03-31` → CSV export
- **For Advisor:** Trade history by client, asset type, settlement status
- **For Client:** Trade history in ARIA Personal with full audit trail visibility

---

## 8. Error Handling

### Expected Failure Modes (Phase 1)

| Scenario | Handling |
|----------|----------|
| Client rejects trade | Status → REJECTED, advisor notified, no debit applied |
| Client approves but misses deadline | No auto-expiry; trade stays pending unless manually cancelled |
| Mock debit fails (shouldn't happen) | Log error, status stays APPROVED, manual intervention required |
| Advisor deletes draft trade | Hard delete (soft-delete option for audit trail; TBD) |
| Client submits invalid tx hash | Log warning in audit trail, flag for manual review |

### Phase 2 Considerations
- Real banking API failures → retry logic + notification to advisor + client
- Exchange API timeouts → queue trade for retry
- Insufficient balance on client account → validation before submission

---

## 9. Testing Strategy

### Unit Tests
- Trade model: validate status transitions, timestamps
- Trade creation: valid asset types, quantity > 0, advisor_id exists
- Audit log: immutable writes, correct event_type values

### Integration Tests
1. **Happy Path (MF):**
   - Advisor creates trade → Submits → Client approves → Backend settles → Verify status = SETTLED
   - Verify audit trail has 4 events
   - Verify mock debit logged

2. **Happy Path (Crypto):**
   - Advisor creates crypto trade → Submits → Client approves → Verify status = SETTLED
   - Verify holdings NOT updated (crypto not in portfolio yet)
   - Verify client can submit optional tx hash

3. **Rejection Flow:**
   - Advisor submits → Client rejects → Verify status = REJECTED
   - Verify no debit applied
   - Verify advisor notification sent

4. **Edit & Cancel:**
   - Advisor creates draft → Edits quantity → Deletes → Verify trade removed (or soft-deleted)

### E2E Tests (Playwright)
1. **Advisor:** Initiate trade, fill form, submit
2. **Client:** See pending trade, review, approve
3. **Both:** Verify settled trade appears in history

---

## 10. Future Phases

### Phase 2
- Real mutual fund API (Smallcase, BSE, NSE)
- Real banking API (Razorpay, HDFC, ICICI)
- Email/SMS/WhatsApp notifications (Twilio, WATI)
- Crypto wallet integration (MetaMask, WalletConnect)
- P&L reporting (cost basis + current value)

### Phase 3+
- Direct stocks, bonds, insurance
- Advisor approval workflow (for large trades)
- Trade batching (one approval for multi-leg trades)
- Execution algorithm (VWAP, TWAP, POI)
- Real-time settlement tracking

---

## 11. Success Criteria (End of Phase 1)

- [ ] Data model migrated + schema valid
- [ ] Trade CRUD APIs working (create, read, update, delete, list)
- [ ] Submit API transitions status correctly
- [ ] Approve/Reject APIs transition status correctly
- [ ] Mock banking debit/credit logged on approval
- [ ] Audit trail immutable (all events logged in TradeAuditLog)
- [ ] Advisor can initiate & submit trades in ARIA Advisor UI
- [ ] Client can approve/reject trades in ARIA Personal UI
- [ ] Trade history visible in both apps
- [ ] Notifications triggered on key events
- [ ] E2E test: Advisor initiate → Client approve → Both see settled trade
- [ ] PRD updated with trade module section ✅
- [ ] This spec document finalized ✅

---

## References

- **ARIA PRD:** `/Users/sunnyhayes/Daytona/aria-advisor/PRD.md` (Module 8: Trade Management section)
- **Trade Management Plan:** `/Users/sunnyhayes/.claude/plans/cuddly-hopping-sprout.md`
- **Design Review Notes:** `/Users/sunnyhayes/Daytona/aria-advisor/NOTES.md` (2026-03-20)
- **RCA & Python 3.14 Gotchas:** `/Users/sunnyhayes/Daytona/aria-advisor/docs/RCA-2026-03-21-login-failure.md`
