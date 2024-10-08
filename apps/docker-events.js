import Docker from "dockerode";
import { removeFromDb, setInDb } from "./db.js";

export const docker = new Docker();

const registerContainer = async (event) => {
  console.log(`Container ${event.Actor.Attributes.name} has started`);
  const container = docker.getContainer(event.id);

  const containerInfo = await container.inspect();
  const containerName = containerInfo.Name.substring(1);
  const ipAddress = containerInfo.NetworkSettings.IPAddress;

  const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts);

  if (!exposedPorts && !exposedPorts.length) {
    console.error("[Error] No exposed ports found");
    return;
  }

  const [port, type] = exposedPorts[0].split("/");
  console.log(`Exposed port: ${port} (${type})`);

  if (type !== "tcp") {
    console.error("[Error] Only TCP ports are supported but got", type);
    return;
  }

  console.log(
    `Registering ${containerName}.localhost --> ${ipAddress}:${port}`
  );

  setInDb(containerName, {
    id: container.id,
    name: containerName,
    image: `${containerInfo.Config.Image}`,
    url: `http://${containerName}.localhost/`,
    ipAddress,
    port,
  });
};

const unregisterContainer = async (event) => {
  console.log(`Container ${event.Actor.Attributes.name} has stopped`);
  const containerName = event.Actor.Attributes.name;
  console.log(`Removing ${containerName}.localhost`);

  removeFromDb(containerName);
};

export async function dockerEventListeners() {
  docker.getEvents((err, stream) => {
    if (err) {
      console.error(err);
      return;
    }

    stream.on("data", (data) => {
      try {
        const event = JSON.parse(data.toString());

        if (event.Type === "container") {
          switch (event.Action) {
            case "start":
              registerContainer(event);
              break;
            case "stop":
              unregisterContainer(event);
              break;
            default:
              console.log(
                `${event.Action} is not supported yet for containers`
              );
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  });
}
