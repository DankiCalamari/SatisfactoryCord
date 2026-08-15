process.stdout.write("LogInit: mock FactoryServer starting\n");
process.stdout.write("[Chat] Beau: hello Discord\n");
process.stderr.write("LogWarning: mock warning\n");

process.stdin.on("data", (chunk) => {
  const line = chunk.toString().trim();
  process.stdout.write(`ConsoleResult: ${line}\n`);
  if (line === "quit") process.exit(0);
  if (line === "crash") process.exit(1);
});

setInterval(() => undefined, 1000);
