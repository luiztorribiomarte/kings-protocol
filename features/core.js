// ===============================
// KP CORE SYSTEM (SAFE ARCHITECTURE)
// ===============================

window.App = window.App || {};

// shared global state (future-proof)
App.state = App.state || {};

// registered features
App.features = App.features || {};

// event system
App.events = App.events || {};

App.on = function(event, fn) {
  if (!App.events[event]) App.events[event] = [];
  App.events[event].push(fn);
};

App.emit = function(event, data) {
  (App.events[event] || []).forEach(fn => {
    try {
      fn(data);
    } catch (e) {
      console.error(`[KP Core] Event error: ${event}`, e);
    }
  });
};

console.log("KP Core loaded");
