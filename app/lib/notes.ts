// Shared by the server (enforcing the rules) and the Lesson page form.
export const NOTE_MAX_LENGTH = 2000;

export const NOTE_EMPTY_ERROR = "Write something before saving your note.";
export const NOTE_TOO_LONG_ERROR = `A note can be at most ${NOTE_MAX_LENGTH.toLocaleString("en-US")} characters.`;
