import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import {
  getNote,
  isBookmarked,
  listBookmarks,
  listNotes,
  saveNote,
  toggleBookmark,
} from "./saved.server";
import { approveRefundRequest, raiseRefundRequest } from "./refunds.server";
import { fakeNotifications } from "./notifications.fake.server";
import { NOTE_MAX_LENGTH } from "./notes";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesAfter(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];
let otherCourseLessonId: number;

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2, 3].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );

  const otherCourse = db
    .insert(schema.courses)
    .values({
      title: "Other Course",
      slug: "other-course",
      description: "Another course",
      salesCopy: "## Other Course",
      instructorId: base.instructor.id,
      categoryId: base.category.id,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();
  const otherModule = db
    .insert(schema.modules)
    .values({ courseId: otherCourse.id, title: "Intro", position: 1 })
    .returning()
    .get();
  otherCourseLessonId = db
    .insert(schema.lessons)
    .values({ moduleId: otherModule.id, title: "Other lesson", position: 1 })
    .returning()
    .get().id;
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: UserRole.Student,
    })
    .returning()
    .get();
}

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson with no Bookmark, and un-bookmarks it on the next toggle", () => {
    const [lessonId] = lessonIds;

    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(true);

    expect(toggleBookmark(db, base.user.id, lessonId, NOW)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonId)).toBe(false);
  });

  it("never leaves a Student with two Bookmarks on one Lesson", () => {
    const [lessonId] = lessonIds;
    toggleBookmark(db, base.user.id, lessonId, NOW);

    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId })
        .run()
    ).toThrow();
    expect(listBookmarks(db, base.user.id)).toHaveLength(1);
  });
});

describe("saving a Note", () => {
  it("creates the Note, trimmed, on a Lesson that has none", () => {
    const result = saveNote(db, base.user.id, lessonIds[0], "  Come back  ", NOW);

    expect(result).toEqual({
      ok: true,
      note: { body: "Come back", updatedAt: NOW.toISOString() },
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "Come back",
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last-edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);
    const later = minutesAfter(5);

    saveNote(db, base.user.id, lessonIds[0], "Second draft", later);

    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "Second draft",
      updatedAt: later.toISOString(),
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("keeps the body as plain text, Markdown characters and all", () => {
    saveNote(db, base.user.id, lessonIds[0], "# Not a heading\n*not bold*", NOW);

    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(
      "# Not a heading\n*not bold*"
    );
  });

  it(`accepts a Note of exactly ${NOTE_MAX_LENGTH} characters`, () => {
    const body = "a".repeat(NOTE_MAX_LENGTH);

    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW).ok).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe(body);
  });

  it(`refuses a Note over ${NOTE_MAX_LENGTH} characters with a message, and stores nothing`, () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(NOTE_MAX_LENGTH + 1),
      NOW
    );

    expect(result).toEqual({
      ok: false,
      error: "A note can be at most 2,000 characters.",
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("refuses an empty Note, and leaves an existing Note untouched", () => {
    saveNote(db, base.user.id, lessonIds[0], "Keep me", NOW);

    const result = saveNote(db, base.user.id, lessonIds[0], "   \n  ", minutesAfter(5));

    expect(result).toEqual({
      ok: false,
      error: "Write something before saving your note.",
    });
    expect(getNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "Keep me",
      updatedAt: NOW.toISOString(),
    });
  });
});

describe("the Saved lists", () => {
  it("lists only the Student's own Bookmarks, newest first, with Lesson and Course", () => {
    const someoneElse = addStudent("Sam");
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, otherCourseLessonId, minutesAfter(2));
    toggleBookmark(db, base.user.id, lessonIds[1], minutesAfter(1));
    toggleBookmark(db, someoneElse.id, lessonIds[2], minutesAfter(3));

    expect(listBookmarks(db, base.user.id)).toMatchObject([
      { lessonId: otherCourseLessonId, lessonTitle: "Other lesson", courseTitle: "Other Course", courseSlug: "other-course" },
      { lessonId: lessonIds[1], lessonTitle: "Lesson 2", courseTitle: "Test Course", courseSlug: "test-course" },
      { lessonId: lessonIds[0], lessonTitle: "Lesson 1", courseTitle: "Test Course", courseSlug: "test-course" },
    ]);
  });

  it("lists only the Student's own Notes, most recently edited first, with Lesson and Course", () => {
    const someoneElse = addStudent("Sam");
    saveNote(db, base.user.id, lessonIds[0], "Oldest", NOW);
    saveNote(db, base.user.id, otherCourseLessonId, "Middle", minutesAfter(1));
    saveNote(db, base.user.id, lessonIds[1], "Was first", NOW);
    saveNote(db, someoneElse.id, lessonIds[2], "Not mine", minutesAfter(5));
    saveNote(db, base.user.id, lessonIds[1], "Edited last", minutesAfter(2));

    expect(listNotes(db, base.user.id)).toMatchObject([
      { body: "Edited last", lessonId: lessonIds[1], courseTitle: "Test Course" },
      { body: "Middle", lessonId: otherCourseLessonId, courseTitle: "Other Course" },
      { body: "Oldest", lessonId: lessonIds[0], courseTitle: "Test Course" },
    ]);
  });
});

describe("an approved Refund", () => {
  it("leaves the Student's Bookmarks and Notes in place", async () => {
    const notifications = fakeNotifications();
    const platformAdmin = db
      .insert(schema.users)
      .values({ name: "Pat Admin", email: "pat@example.com", role: UserRole.Admin })
      .returning()
      .get();
    const purchase = db
      .insert(schema.purchases)
      .values({
        userId: base.user.id,
        courseId: base.course.id,
        amountPaid: 7900,
        createdAt: new Date(NOW.getTime() - 3 * 86_400_000).toISOString(),
      })
      .returning()
      .get();
    db.insert(schema.enrollments)
      .values({ userId: base.user.id, courseId: base.course.id })
      .run();

    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    saveNote(db, base.user.id, lessonIds[0], "Still mine", NOW);

    const raised = await raiseRefundRequest(
      db,
      purchase.id,
      base.user.id,
      "Not for me.",
      NOW,
      notifications
    );
    if (!raised.ok) throw new Error(raised.error);
    const approved = await approveRefundRequest(
      db,
      raised.refundRequestId,
      platformAdmin.id,
      null,
      NOW,
      notifications
    );
    expect(approved.ok).toBe(true);

    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);
    expect(getNote(db, base.user.id, lessonIds[0])?.body).toBe("Still mine");
  });
});
