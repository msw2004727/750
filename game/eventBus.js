const listeners = new Map();

export const bus = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(handler);
  },
  off(event, handler) {
    const arr = listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(handler);
      if (idx >= 0) arr.splice(idx, 1);
    }
  },
  emit(event, data) {
    const arr = listeners.get(event);
    if (arr) for (const fn of [...arr]) fn(data);
  },
};
