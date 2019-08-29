import fetch from "node-fetch";
import path from "path";
import { GenericContainer } from "./generic-container";
import { Wait } from "./wait";

describe("GenericContainer", () => {
  jest.setTimeout(45000);

  it("should wait for port", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await container.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should wait for log", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forLogMessage("Listening on port 8080"))
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await container.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });

  it("should set environment variables", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withEnv("customKey", "customValue")
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/env`);
    const responseBody = await response.json();
    expect(responseBody.customKey).toBe("customValue");

    await container.stop();
  });

  it("should set command", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withCmd(["node", "index.js", "one", "two", "three"])
      .withExposedPorts(8080)
      .start();

    const url = `http://${container.getContainerIpAddress()}:${container.getMappedPort(8080)}`;
    const response = await fetch(`${url}/cmd`);
    const responseBody = await response.json();
    expect(responseBody).toEqual(["/usr/local/bin/node", "/index.js", "one", "two", "three"]);

    await container.stop();
  });

  it("should set tmpfs", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withTmpFs({ "/testtmpfs": "rw" })
      .withExposedPorts(8080)
      .start();

    const tmpFsFile = "/testtmpfs/test.file";

    const { exitCode: exitCode1 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode1).toBe(1);

    await container.exec(["touch", tmpFsFile]);
    const { exitCode: exitCode2 } = await container.exec(["ls", tmpFsFile]);
    expect(exitCode2).toBe(0);

    await container.stop();
  });

  it("should execute a command on a running container", async () => {
    const container = await new GenericContainer("cristianrgreco/testcontainer", "1.1.11")
      .withExposedPorts(8080)
      .start();

    const { output, exitCode } = await container.exec(["echo", "hello", "world"]);

    expect(exitCode).toBe(0);
    expect(output).toContain("hello world");

    await container.stop();
  });

  it("should build and start from a Dockerfile", async () => {
    const context = path.resolve(__dirname, "..", "docker");
    const container = await GenericContainer.fromDockerfile(context);
    const startedContainer = await container.withExposedPorts(8080).start();

    const url = `http://${startedContainer.getContainerIpAddress()}:${startedContainer.getMappedPort(8080)}`;
    const response = await fetch(`${url}/hello-world`);
    expect(response.status).toBe(200);

    await startedContainer.stop();
    await expect(fetch(url)).rejects.toThrowError();
  });
});
