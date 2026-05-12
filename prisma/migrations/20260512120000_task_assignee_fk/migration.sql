-- AddTaskAssigneeFK
-- assigneeUserId already exists; enforce referential integrity to User
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_assigneeUserId_fkey";
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_assigneeUserId_fkey"
  FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
