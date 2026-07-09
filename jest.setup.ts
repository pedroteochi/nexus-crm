// Global Jest setup (runs before each test file, before the test framework).
//
// Per-test native mocks (AsyncStorage, SecureStore) are declared at the top of
// each test file so the mocking strategy stays explicit and colocated with the
// assertions that depend on it. This file is the single place to add any global
// setup the whole suite needs later (e.g. gesture-handler jest setup once we add
// component-level render tests).

// @supabase/realtime-js builds a RealtimeClient inside createClient() and needs a
// WebSocket constructor to exist. The node test env has none, so provide an inert
// stub — tests import the Supabase client but never open a realtime channel.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === 'undefined') {
  (globalThis as { WebSocket?: unknown }).WebSocket = class WebSocketStub {};
}
