const { runDeadlineNotificationJob, closeDatabase } = require("../server");

async function main() {
  const result = await runDeadlineNotificationJob();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase().catch((error) => {
      console.error("Không đóng được kết nối DB:", error);
      process.exitCode = 1;
    });
  });
