console.log("KP Boot loaded");

// Safe init order
window.addEventListener("load", () => {
  if (typeof debugHabits === "function") debugHabits();
  if (typeof renderLifeScore === "function") renderLifeScore();
});
