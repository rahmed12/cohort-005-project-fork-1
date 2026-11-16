# Hosted notification services for Cadence: research

**Date checked:** 2026-11-16. **Pricing and plan limits can change.** Re-check each vendor's pricing page before deciding.

**Scope:** Knock, Novu (cloud), Courier, MagicBell, SuprSend, and OneSignal. The research is about Cadence's event-triggered, persisted per-user Notification Feed, delivered through our own UI (a headless API). Email is researched here but not designed. Mobile push is headroom only. All facts come from vendor docs, pricing pages, the official SDK repos, and the npm registry. Anything not confirmed on a primary page is marked **unverified**. These are facts only. There is no recommendation.

## Summary comparison

| Vendor | Free tier | Headless feed API | Live updates | Email | Push (headroom) | Per-user preferences | Node SDK (latest on npm) | Feed auth for users | Dev/test environments |
|---|---|---|---|---|---|---|---|---|---|
| Knock | 10k messages/mo; unlimited feed retention; 30-day logs; next plan is $250/mo | Yes: REST plus `@knocklabs/client` (cursor pagination, read/unread, mark-all-read, `unread_count`) | WebSocket | Bring your own (SES, Resend, Postmark, SendGrid, more); a Knock test provider exists | APNs, FCM, Expo, OneSignal, SNS | Per workflow, category, and channel type; API plus a hosted page | `@knocklabs/node` 1.41.1 (2026-11-10), typed | RS256 JWT user token; off by default ("enhanced security mode") | Dev and prod environments with separate keys; sandbox mode |
| Novu Cloud | 10k workflow runs/mo; 5 workflows; 2 environments; 24h activity log; next plan is $30/mo | Yes: `@novu/js` (limit/offset, read/unread, readAll, count) | WebSocket | Bring your own (SendGrid, SES, Resend, Postmark, SMTP); demo provider for tests | FCM, APNs, Expo, OneSignal, Pusher Beams, more | Per workflow × channel plus global; API plus the Inbox prefs UI | `@novu/api` 3.20.0 (2026-11-16), typed; `@novu/node` deprecated | HMAC `subscriberHash`; optional toggle | Dev and prod (custom environments need Team+); publish flow |
| Courier | 10k sends/mo (users and retention unstated); next plan is pay-as-you-go $0.005/send | Yes: `@trycourier/courier-js` (getMessages, read/unread, readAll, unread count) | Socket (protocol not named) | Bring your own only ("Courier isn't an email provider") | FCM, APNs, Expo, OneSignal | Per topic, with per-channel custom routing; API, a hosted page, and embeddable components | `@trycourier/courier` 10.0.0 (2026-10-29), typed | Backend-minted JWT required (scoped `user_id:`) | Test and prod environments with separate keys |
| MagicBell | 1,000 deliveries/mo; 1 project; next plan is $249/mo | Yes: REST plus `magicbell-js` (cursor pagination, status filter, mark-all-read, unread count) | WebSocket (Ably-based) | Bring your own (SES, Mailgun, SendGrid, SMTP, Ping Email); no Resend or Postmark listed | APNs, FCM, Expo, web push | Per category × channel; API (hosted UI unverified) | `magicbell` 4.5.1 (2026-03-20); `magicbell-js` 1.8.0 (2026-07-29) | HS256 user JWT signed with the project secret | No documented environments or test mode (unverified) |
| SuprSend | 10k notifications/mo; 30-day logs; **preferences and digest locked to paid**; branded feed; next plan is $100/mo (annual) | Yes: `@suprsend/web-sdk` (fetch/fetchNextPage, read/unread, markAllAsRead) | WebSocket | Sandbox has preset vendors; staging and prod bring your own (SES, Resend, Postmark, SendGrid...) | APNs, FCM, Expo, web push | Category plus channel-in-category plus global; API, hosted and embedded centre (**paid**) | `@suprsend/node-sdk` 1.15.1 (2026-05-19), typed | ES256 JWT; "enhanced security mode" optional | Sandbox, staging, and prod workspaces; Test Mode in staging |
| OneSignal | 1k MAU for mobile push and in-app; 10k emails/mo; next plan is $19/mo | **No per-user inbox found.** In-app messages are mobile-only, dashboard-built campaigns | n/a | Built-in sender, or SendGrid, Mailgun, Mandrill | Core product (mobile plus web push) | Build it yourself with tags; per-subscription `enabled` flag | `@onesignal/node-onesignal` 5.20.0 (2026-10-15), typed | External ID; JWT identity verification (details unverified) | No documented test mode (unverified) |

## Standouts

- **Knock:** Feed retention is "unlimited, configurable" on Free. The headless JS client is the most complete one checked: `fetchNextPage`, `markAllAsRead`, `markAllAsSeen`, and archive helpers. Its docs say to use your internal user id. Trigger calls can inline-identify users.
- **Novu:** It has the cheapest paid step ($30/mo). Subscribers are created just-in-time from the trigger `to`. `@novu/js` has a full headless method set and WebSocket events (`notifications.unread_count_changed`).
- **Courier:** Inbox messages persist "until it is archived or expires", with no fixed retention period. `user_id` "is yours, not Courier's" and doesn't need to exist first. It sets one-click `List-Unsubscribe` headers, but only on SendGrid today.
- **SuprSend:** It has the most explicit dev/test story: Sandbox, Staging, and Production workspaces; Test Mode that blocks or redirects email to non-testers; and auto one-click unsubscribe on "commercial" categories.
- **MagicBell:** It has the cleanest REST feed surface: `GET /notifications?status=unread&limit&starting_after`, `POST /notifications/read` (all), and `GET /notifications/unread/count`.

## Dealbreakers and watch-outs

- **OneSignal has no persistent per-user inbox.** In-app messages are "only available for mobile apps", are created in the dashboard, and trigger on app open or custom triggers. The "Notification History API" is a paid feature and lists sent messages, not a per-user feed. It doesn't fit the Notification Feed concept.
- **SuprSend Free locks user preferences** (plus digest, batching, and removing branding from the feed). Per-type opt-out would need the paid Essentials plan ($100/mo, billed annually). The free in-app feed carries SuprSend branding.
- **MagicBell Free is 1,000 deliveries/mo**, about 10× lower than the others. The next step is $249/mo. Environments, test mode, and retention are not documented (unverified).
- **Novu Free keeps only 24h of activity-feed logs** and allows only 5 workflows. Four roles × several event types could exceed 5 workflows (inference). Inbox message retention is unverified.
- **Courier has no built-in email sender**, and its free pricing card doesn't state user caps, retention, or whether Inbox is included (unverified). Client auth always needs a backend-minted JWT, with no documented keyless dev mode.
- **Knock's paid entry is $250/mo**, the steepest step after Free. Without enhanced security mode, "a public key alone authenticates any user". That is convenient for DevUI user switching but must be turned on for production.

---

## Knock

- **Free:** $0. Up to 10,000 messages/mo, unlimited stored profiles, 30-day log retention, feed retention "unlimited, configurable". Paid-only features include branding removal, translations, per-tenant preferences, audit logs, and SSO/SCIM. Starter is "$250/ month + additional usage". [pricing](https://knock.app/pricing)
- **Feed API:** `GET /v1/users/{user_id}/feeds/{channel_id}` with `page_size` (default 50), `after`/`before` cursors, and a `status` filter. `meta` returns `total_count`, `unread_count`, and `unseen_count`. Client-side calls use the publishable key plus a user token. [list feed items](https://docs.knock.app/api-reference/users/feeds/list_items)
- **Item statuses:** Items carry `seen_at`, `read_at`, `link_clicked_at`, and `archived_at`. The headless guide is UI-agnostic. [in-app API overview](https://docs.knock.app/in-app-ui/api-overview)
- **Bulk status:** `POST /v1/channels/{channel_id}/messages/bulk/{action}` updates statuses in bulk, filterable by recipient (server-side). [bulk update](https://docs.knock.app/api-reference/channels/bulk/update_message_status)
- **`@knocklabs/client` feed methods (from source):** `fetch`, `fetchNextPage`, `markAsRead`, `markAsUnread`, `markAllAsRead`, `markAllAsSeen`, `markAsArchived`, `markAllAsArchived`, `listenForUpdates`. It works without the React components. [feed.ts](https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/feed.ts), [JS SDK overview](https://docs.knock.app/in-app-ui/javascript/overview)
- **Live updates:** A WebSocket "new-message" event carries badge counts but not the full message. The client refetches. [in-app API overview](https://docs.knock.app/in-app-ui/api-overview)
- **Email:** Bring your own provider: SES, Cloudflare, MailerSend, Mailgun, Mailjet, Mailtrap, Mandrill, Postmark, Resend, SendGrid, SMTP, SparkPost. "Knock (testing only)" is a test provider. [email overview](https://docs.knock.app/integrations/email/overview)
- **Unsubscribe:** One-click unsubscribe links exist for *commercial* notifications (they set `commercial_subscribed=false`). `List-Unsubscribe` header handling is unverified. [preferences](https://docs.knock.app/preferences/overview)
- **Push (headroom):** APNs, FCM, Expo, OneSignal, Amazon SNS. [push overview](https://docs.knock.app/integrations/push/overview)
- **Preferences:** Keys are `categories`, `workflows`, `channel_types`, and `channels`, defaulting to `true`. The Node SDK has `users.setPreferences` and `bulkSetPreferences`. There is a hosted preference page via a signed URL (default set only). [preferences](https://docs.knock.app/preferences/overview)
- **Node SDK:** `@knocklabs/node` 1.41.1, published 2026-11-10, ships `index.d.ts`, and is Stainless-generated. [releases](https://github.com/knocklabs/knock-node/releases), [npm](https://www.npmjs.com/package/@knocklabs/node)
- **User id:** "We recommend using your internal user identifier for the `id` value." Recipients can be inline-identified in the trigger call (upserted first), or identified via `PUT /v1/users/{id}`. [identifying recipients](https://docs.knock.app/managing-recipients/identifying-recipients)
- **Feed auth:** Enhanced security mode needs an RS256 JWT (`sub` = user id) signed with a signing key, via `signUserToken` in the Node SDK. It is "off by default" and can stay off in development. [security](https://docs.knock.app/in-app-ui/security-and-authentication)
- **Environments:** Development and Production, plus custom environments in between. Each has its own API keys, and provider credentials are configured per environment. [environments](https://docs.knock.app/concepts/environments)
- **Test mode:** Sandbox mode "generates and previews the messages without delivering them". It can be set per trigger via `settings.sandbox_mode`. A local emulator or mock was not found (unverified). [testing workflows](https://docs.knock.app/send-notifications/testing-workflows)

## Novu (cloud)

- **Free:** $0. 10,000 workflow runs/mo, unlimited subscribers, up to 5 workflows, 2 environments, 24h activity-feed retention, 3 team members, all channels, Novu branding. Pro starts at $30/mo, and extra runs are not offered on Free. [pricing](https://novu.co/pricing)
- **Feed API:** `@novu/js` offers `notifications.list` (limit, offset, `read` filter), `read`, `unread`, `readAll` (filter by tags or data), `count`, and `archive`. Cursor pagination is unverified. [JS SDK](https://docs.novu.co/platform/sdks/javascript)
- **React hooks:** `@novu/react` adds headless hooks: `useNotifications` (`hasMore`/`fetchMore`) and `useCounts`. [headless mode](https://docs.novu.co/platform/inbox/headless-mode)
- **Live updates:** "real-time event handling through WebSocket connections". Events include `notifications.notification_received` and `notifications.unread_count_changed`. [JS SDK](https://docs.novu.co/platform/sdks/javascript)
- **Inbox retention:** In-app message retention is unverified. The 24h figure is the activity log. [inbox overview](https://docs.novu.co/platform/inbox/overview)
- **Email:** Bring your own: SendGrid, SES, Resend, Postmark, Mailgun, SMTP, with multiple providers and routing. A demo integration is for tests only. [email](https://docs.novu.co/platform/integrations/email)
- **Unsubscribe:** Novu does *not* add unsubscribe links by default. You build a token link and set prefs via the API. `List-Unsubscribe` is unverified. [email](https://docs.novu.co/platform/integrations/email)
- **Push (headroom):** FCM, Expo, APNs, OneSignal, Pusher Beams, Pushpad, push webhook. [push](https://docs.novu.co/platform/integrations/push)
- **Preferences:** Per workflow × channel, plus global channel prefs. Critical workflows hide from prefs. Retrieve and update via the API, and the prebuilt `<Inbox />` has a Preferences view. [preferences](https://docs.novu.co/platform/concepts/preferences)
- **Node SDK:** `@novu/api` 3.20.0, published 2026-11-16, ships `index.d.ts`. `@novu/node` is deprecated ("end of support" March 20, 2025). [npm @novu/api](https://www.npmjs.com/package/@novu/api), [npm @novu/node](https://www.npmjs.com/package/@novu/node)
- **User id:** "Use your application's internal user ID as the `subscriberId`". Subscribers are created "on the fly" from trigger `to`. [subscribers](https://docs.novu.co/platform/concepts/subscribers)
- **Feed auth:** HMAC-SHA256 `subscriberHash` of the `subscriberId`. It is an opt-in toggle per environment's In-App integration. When it is on, the Inbox won't load without it. [prepare for production](https://docs.novu.co/platform/inbox/prepare-for-production)
- **Environments:** Development and Production have separate keys. Production is view-only for workflows, and changes are published from dev. Custom environments are Team/Enterprise only. Integrations are per environment. [environments](https://docs.novu.co/platform/concepts/environments)
- **Test mode:** A dedicated test mode or mock is unverified.

## Courier

- **Free:** $0. "up to 10k / mo" sends, with journeys, broadcasts, SDKs, and the CLI included. Users, retention, and Inbox inclusion are not stated (unverified). The Business plan is "$0.005 per send". [pricing](https://www.courier.com/pricing)
- **Feed API:** `@trycourier/courier-js` offers `inbox.getMessages({filter})`, `getUnreadMessageCount()`, `read`, `unread`, and `readAll()`, plus a socket with `NewMessage`, `Read`, `Unread`, and `MarkAllRead` events. [courier-js](https://www.courier.com/docs/sdk-libraries/courier-js-web.md)
- **Custom inbox:** Web uses `fetchNextPageOfMessages`, `setPaginationLimit`, `readAllMessages`, `totalUnreadCount`, and `listenForUpdates`. [build a custom inbox](https://www.courier.com/docs/in-app/build-a-custom-inbox.md)
- **Retention and live updates:** A message "stays in the feed until it is archived or expires". The realtime "socket" protocol isn't named. [inbox behavior](https://www.courier.com/docs/in-app/how-the-inbox-behaves.md)
- **Email:** "Courier isn't an email provider. It sends through the providers you connect". Supported: SES, SendGrid, Postmark, Mailgun, Resend, SMTP, Mandrill, SparkPost, Mailjet, MailerSend, and more, with failover. [email providers](https://www.courier.com/docs/integrations/email/overview.md)
- **Unsubscribe:** There is a per-topic `unsubscribe` link variable. One-click `List-Unsubscribe` headers are added but "SendGrid is the only provider Courier emits these headers on today". [preference center](https://www.courier.com/docs/guides/build-a-preference-center.md)
- **Push (headroom):** FCM, APNs, Expo, OneSignal. Inbox needs "Nothing to connect". [integrations](https://www.courier.com/docs/integrations/overview.md)
- **Preferences:** Topics are `OPTED_IN`, `OPTED_OUT`, or `REQUIRED`, mapped to templates. Per-channel `customRouting` is per topic. There is a hosted page and an embeddable component, plus a `preferences:user:updated` webhook. [preference center](https://www.courier.com/docs/guides/build-a-preference-center.md), [courier-js](https://www.courier.com/docs/sdk-libraries/courier-js-web.md)
- **Node SDK:** `@trycourier/courier` 10.0.0, published 2026-10-29. "Every request and response has a TypeScript definition". Node 20+. [Node SDK](https://www.courier.com/docs/sdk-libraries/node.md)
- **User id:** "The user_id is yours, not Courier's". It doesn't need to exist in Courier first. Sends address `to: { user_id }`. [authenticate users](https://www.courier.com/docs/in-app/authenticate-users.md)
- **Feed auth:** The backend calls `POST /auth/issue-token` with scope `user_id:<id> inbox:read:messages inbox:write:events` and `expires_in`. Without an expiry, the token "never expires". There is no documented keyless or dev alternative. [authenticate users](https://www.courier.com/docs/in-app/authenticate-users.md)
- **Environments:** "Test and Production are separate environments with their own keys, templates, and logs". Configure sandbox provider keys in Test so sends stay out of real inboxes. A mock provider is unverified. [go live](https://www.courier.com/docs/guides/go-live.md)

## MagicBell

- **Free (Builder):** $0. 1,000 deliveries/mo, 1 project, unlimited users, all integrations. Startup is $249/mo for 50k deliveries. Retention is not stated (unverified). [pricing](https://www.magicbell.com/pricing)
- **Feed API (user API):**
  - `GET /notifications` with `limit` (default 50), `startingAfter`/`endingBefore` cursors, and `status` (`unseen|unread|read|archived`).
  - `POST /notifications/read` (mark all), `/notifications/seen`, `/notifications/archive`.
  - `GET /notifications/unread/count`.
  - Per-item `/read`, `/unread`, `/archive`.
  - [NotificationsService](https://github.com/magicbell/magicbell-js/blob/main/packages/magicbell-js/docs/user-client/services/NotificationsService.md)
- **Live updates:** `magicbell-js/realtime` "real-time notification delivery through WebSocket connections" with auto-reconnect. Inbox tokens reference an "Ably connection". [magicbell-js README](https://github.com/magicbell/magicbell-js/blob/main/packages/magicbell-js/README.md), [API reference](https://www.magicbell.com/docs/api/reference)
- **Email:** SES, Mailgun, SMTP, Ping Email, SendGrid are listed. Resend and Postmark are not listed. Templating and unsubscribe are unverified. [email channel](https://www.magicbell.com/docs/channels/email)
- **Push (headroom):** APNs, Expo, FCM, web push. [docs index](https://www.magicbell.com/docs)
- **Preferences:** `GET/PUT /channels/user_preferences`. The model is categories → channels → `enabled`. A hosted preference UI is unverified. [API reference](https://www.magicbell.com/docs/api/reference)
- **Node SDK:** `magicbell-js` 1.8.0 (2026-07-29) has `project-client`, `user-client`, and `realtime` subpaths. `magicbell` 4.5.1 (2026-03-20) has typings. [magicbell-js docs](https://www.magicbell.com/docs/libraries/magicbell-js), [npm](https://www.npmjs.com/package/magicbell-js)
- **User id:** `external_id` "typically, the `user_id`". It cannot be changed once set. Upsert creates users. Implicit creation on broadcast is unverified. [user primitive](https://www.magicbell.com/docs/primitive/user)
- **Feed auth:** The backend signs an HS256 user JWT with the project Secret Key (claims `user_external_id` and/or `user_email`, plus `api_key`). No dev bypass is documented. [user JWT](https://www.magicbell.com/docs/api/authentication/user)
- **Server auth:** A Project JWT is created in the dashboard. [project JWT](https://www.magicbell.com/docs/api/authentication/project)
- **Environments:** Dev/test environments and test mode are not documented (unverified). Free allows 1 project, so a separate dev project is not possible on Free (inference).

## SuprSend

- **Free:** $0. 10,000 notifications/mo, 30-day log retention, unlimited channels, an in-app feed with SuprSend branding, and a 30-day trial of all features.
- **Locked to paid:** Batching/digest, **user preferences**, objects, i18n, timezone sends, and branding removal. Essentials is $100/mo billed annually, for 50k notifications. [pricing](https://www.suprsend.com/pricing)
- **Feed API:** `@suprsend/web-sdk` offers `feeds.initialize({pageSize, stores, tenantId})`, `fetch`, `fetchNextPage`, `markAsRead`, `markAsUnread`, `markAllAsRead`, `markAsSeen`, and `resetBadgeCount`. A separate unread-count field is unverified. [JS in-app feed](https://docs.suprsend.com/docs/js-inapp-feed.md)
- **React headless:** React headless hooks are in `@suprsend/react`. `@suprsend/react-inbox` is deprecated on npm. [React headless feed](https://docs.suprsend.com/docs/react-sdk-headless-feed.md)
- **Live updates:** `initializeSocketConnection()` plus the `feed.new_notification` and `feed.store_update` events. [JS in-app feed](https://docs.suprsend.com/docs/js-inapp-feed.md)
- **Inbox retention:** Unverified (not stated). [inbox overview](https://docs.suprsend.com/docs/inbox-overview.md)
- **Email:** The Sandbox workspace has preconfigured vendors, but email goes only to verified channels (max 5). Staging and Production bring their own vendors (SendGrid, SES, Mailgun, Resend, Postmark, Mailjet). [workspaces](https://docs.suprsend.com/docs/workspaces.md), [docs index](https://docs.suprsend.com/_llms/documentation.txt)
- **Unsubscribe:** One-click `List-Unsubscribe` is added automatically for "Is commercial" sub-categories. The link is valid for 90 days. Hosted (`{{$hosted_preference_url}}`) and embedded preference centres are available. [user preferences](https://docs.suprsend.com/docs/user-preferences.md)
- **Push (headroom):** Mobile push (APNs, FCM, Expo) and web push nodes. [docs index](https://docs.suprsend.com/llms.txt)
- **Preferences:** Global channel opt-outs, category opt-in/out, and per-channel opt-out within a category, via REST (`PATCH /v1/user/{distinct_id}/preference/category/{slug}/`) and SDKs. Inbox-channel prefs need a support feature flag. This is a paid feature per pricing. [user preferences](https://docs.suprsend.com/docs/user-preferences.md)
- **Node SDK:** `@suprsend/node-sdk` 1.15.1 (2026-05-19), ships `types/index.d.ts`. [npm](https://www.npmjs.com/package/@suprsend/node-sdk)
- **User id:** `distinct_id` is "typically your database's user primary key". Users can be inline-upserted via trigger `recipients`. A distinct_id-only trigger to an unknown user "fails". [users](https://docs.suprsend.com/docs/users.md)
- **Feed auth:** An ES256 JWT (`entity_type: subscriber`, `entity_id` = distinct_id, `exp`, optional tenant `scope`). "Enhanced security mode" is an optional toggle, and its default is unverified. [client authentication](https://docs.suprsend.com/docs/client-authentication.md)
- **Environments:** Sandbox, Staging, and Production workspaces, each with its own keys (including signing keys). [workspaces](https://docs.suprsend.com/docs/workspaces.md)
- **Test Mode (Staging):** It delivers "only to designated internal testers" and blocks or redirects email, SMS, and WhatsApp otherwise. Plan availability is unverified. [test mode](https://docs.suprsend.com/docs/developer/test-mode.md)

## OneSignal

- **Free:** Mobile push and in-app are unlimited for ≤1,000 MAU. 10,000 email sends/mo. Web push is "Max 10,000 subscribers per send". Limits: 3 journeys and 6 segments.
- **Paid-only:** Notification History API, frequency capping, confirmed receipt, and more. Growth "Starts at $19/mo". [pricing](https://onesignal.com/pricing)
- **In-app is not an inbox:** "In-app messages are only available for mobile apps with the OneSignal mobile SDK installed". They are built in the dashboard and shown on triggers (app open, session time, `addTrigger`). There is no per-user feed or read-state API. [in-app setup](https://documentation.onesignal.com/docs/in-app-messages-setup)
- **Message history API:** The "View messages" API lists sent messages app-wide, not per user. [view messages](https://documentation.onesignal.com/reference/view-messages)
- **Live updates:** Not applicable (no feed).
- **Email:** Built-in OneSignal Email, or SendGrid, Mailgun, or Mandrill. SES and Resend are not listed. Unsubscribe handling is unverified. [email setup](https://documentation.onesignal.com/docs/en/email-setup)
- **Push:** The core product (mobile and web push). [pricing](https://onesignal.com/pricing)
- **Preferences:** "OneSignal does not provide any APIs for creating the Preference Center layout". Per-type opt-out is DIY via tags. Channel opt-out is via the subscription `enabled` flag. [preference center](https://documentation.onesignal.com/docs/en/preference-center)
- **Node SDK:** `@onesignal/node-onesignal` 5.20.0 (2026-10-15), typed. [npm](https://www.npmjs.com/package/@onesignal/node-onesignal)
- **User id:** External ID is "your internal user ID", set via `OneSignal.login`. JWT identity verification exists, but its details are unverified. [users](https://documentation.onesignal.com/docs/en/users)
- **Environments:** Dev/test separation or a test mode is not documented on the pages checked (unverified).

## Sources

- Knock:
  - https://knock.app/pricing
  - https://docs.knock.app/in-app-ui/api-overview
  - https://docs.knock.app/api-reference/users/feeds/list_items
  - https://docs.knock.app/api-reference/channels/bulk/update_message_status
  - https://docs.knock.app/in-app-ui/security-and-authentication
  - https://docs.knock.app/concepts/environments
  - https://docs.knock.app/send-notifications/testing-workflows
  - https://docs.knock.app/integrations/email/overview
  - https://docs.knock.app/integrations/push/overview
  - https://docs.knock.app/preferences/overview
  - https://docs.knock.app/managing-recipients/identifying-recipients
  - https://docs.knock.app/in-app-ui/javascript/overview
  - https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/feed.ts
  - https://github.com/knocklabs/knock-node/releases
- Novu:
  - https://novu.co/pricing
  - https://docs.novu.co/platform/sdks/javascript
  - https://docs.novu.co/platform/inbox/headless-mode
  - https://docs.novu.co/platform/inbox/overview
  - https://docs.novu.co/platform/inbox/prepare-for-production
  - https://docs.novu.co/platform/integrations/email
  - https://docs.novu.co/platform/integrations/push
  - https://docs.novu.co/platform/concepts/preferences
  - https://docs.novu.co/platform/concepts/subscribers
  - https://docs.novu.co/platform/concepts/environments
- Courier:
  - https://www.courier.com/pricing
  - https://www.courier.com/docs/sdk-libraries/courier-js-web.md
  - https://www.courier.com/docs/in-app/build-a-custom-inbox.md
  - https://www.courier.com/docs/in-app/how-the-inbox-behaves.md
  - https://www.courier.com/docs/in-app/authenticate-users.md
  - https://www.courier.com/docs/in-app/send-to-the-inbox.md
  - https://www.courier.com/docs/integrations/email/overview.md
  - https://www.courier.com/docs/integrations/overview.md
  - https://www.courier.com/docs/guides/build-a-preference-center.md
  - https://www.courier.com/docs/guides/go-live.md
  - https://www.courier.com/docs/sdk-libraries/node.md
- MagicBell:
  - https://www.magicbell.com/pricing
  - https://www.magicbell.com/docs/api/reference
  - https://www.magicbell.com/docs/channels/in_app
  - https://www.magicbell.com/docs/channels/email
  - https://www.magicbell.com/docs/api/authentication/user
  - https://www.magicbell.com/docs/api/authentication/project
  - https://www.magicbell.com/docs/primitive/user
  - https://www.magicbell.com/docs/libraries/magicbell-js
  - https://github.com/magicbell/magicbell-js (README, NotificationsService.md)
- SuprSend:
  - https://www.suprsend.com/pricing
  - https://docs.suprsend.com/docs/js-inapp-feed.md
  - https://docs.suprsend.com/docs/react-inbox-integration.md
  - https://docs.suprsend.com/docs/client-authentication.md
  - https://docs.suprsend.com/docs/workspaces.md
  - https://docs.suprsend.com/docs/developer/test-mode.md
  - https://docs.suprsend.com/docs/users.md
  - https://docs.suprsend.com/docs/user-preferences.md
  - https://docs.suprsend.com/docs/inbox-overview.md
- OneSignal:
  - https://onesignal.com/pricing
  - https://documentation.onesignal.com/docs/in-app-messages-setup
  - https://documentation.onesignal.com/reference/view-messages
  - https://documentation.onesignal.com/docs/en/email-setup
  - https://documentation.onesignal.com/docs/en/preference-center
  - https://documentation.onesignal.com/docs/en/users
- npm registry (versions and publish dates, queried 2026-11-16 via `npm view`): `@knocklabs/node`, `@knocklabs/client`, `@novu/api`, `@novu/js`, `@novu/node`, `@trycourier/courier`, `@trycourier/courier-js`, `magicbell`, `magicbell-js`, `@suprsend/node-sdk`, `@suprsend/web-sdk`, `@suprsend/react-inbox`, `@onesignal/node-onesignal`
