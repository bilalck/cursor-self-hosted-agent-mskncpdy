import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractLinearTaskRequest,
  type LinearWebhookPayload,
} from "./linear.js";

const prefix = "@cursor";

function issuePayload(
  action: "create" | "update",
  extra: Partial<LinearWebhookPayload> = {},
): LinearWebhookPayload {
  return {
    action,
    type: "Issue",
    createdAt: "2026-10-17T11:00:00.000Z",
    data: {
      id: "issue-1",
      title: "Flaky auth",
      description: "@cursor Fix the flaky auth test",
    },
    ...extra,
  };
}

test("Issue create with @cursor in the description launches once", () => {
  const task = extractLinearTaskRequest(issuePayload("create"), prefix);
  assert.ok(task);
  assert.equal(task.issueId, "issue-1");
  assert.match(task.prompt, /Fix the flaky auth test/);
});

test("Issue update that only changes status does not relaunch", () => {
  const task = extractLinearTaskRequest(
    issuePayload("update", {
      updatedFrom: { stateId: "state-started" },
    }),
    prefix,
  );
  assert.equal(task, null);
});

test("Issue update with no updatedFrom does not launch", () => {
  const task = extractLinearTaskRequest(issuePayload("update"), prefix);
  assert.equal(task, null);
});

test("Issue update that newly adds @cursor to the description launches", () => {
  const task = extractLinearTaskRequest(
    issuePayload("update", {
      updatedFrom: { description: "Investigate auth flakes" },
    }),
    prefix,
  );
  assert.ok(task);
  assert.match(task.prompt, /Fix the flaky auth test/);
});

test("Issue update that keeps the same @cursor command does not relaunch", () => {
  const task = extractLinearTaskRequest(
    issuePayload("update", {
      updatedFrom: {
        description: "@cursor Fix the flaky auth test\n\nMore context",
      },
    }),
    prefix,
  );
  assert.equal(task, null);
});

test("Comment create with @cursor still launches", () => {
  const task = extractLinearTaskRequest(
    {
      action: "create",
      type: "Comment",
      createdAt: "2026-10-17T11:00:00.000Z",
      data: {
        issueId: "issue-1",
        body: "@cursor Summarize the failing CI job",
      },
    },
    prefix,
  );
  assert.ok(task);
  assert.equal(task.issueId, "issue-1");
  assert.equal(task.prompt, "Summarize the failing CI job");
});
