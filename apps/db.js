const db = new Map();

export const getFromDb = (key) => db.get(key);

export const setInDb = (key, value) => db.set(key, value);

export const removeFromDb = (key) => db.delete(key);

export const hasInDb = (key) => db.has(key);

export const getAllFromDb = () => Array.from(db.values());
