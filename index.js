// Express server

const Docker = require("dockerode");
const express = require("express");
const http = require("http");
const httpProxy = require("http-proxy");

const db = new Map();
const proxy = httpProxy.createProxy({});

const docker = new Docker();

// Docker Events
docker.getEvents((err, stream) => {
  if (err) {
    console.error(err);
    return;
  }

  stream.on("data", async (data) => {
    try {
      const event = JSON.parse(data.toString());

      if (event.Type === "container" && event.Action === "start") {
        console.log(`Container ${event.Actor.Attributes.name} has started`);
        const container = docker.getContainer(event.id);

        const containerInfo = await container.inspect();
        const containerName = containerInfo.Name.substring(1);
        const ipAddress = containerInfo.NetworkSettings.IPAddress;

        const exposedPorts = Object.keys(containerInfo.Config.ExposedPorts);

        if (!exposedPorts && !exposedPorts.length) {
          console.log("[Error] No exposed ports found");
          return;
        }

        console.log(exposedPorts);

        const [port, type] = exposedPorts[0].split("/");
        console.log(`Exposed port: ${port} (${type})`);

        if (type !== "tcp") {
          console.log("[Error] Only TCP ports are supported but got", type);
          return;
        }

        console.log(
          `Registering ${containerName}.localhost --> ${ipAddress}:${port}`
        );

        db.set(containerName, {
          ipAddress,
          port,
        });
      }
    } catch (error) {
      console.error(error);
    }
  });

  stream.on("end", () => {
    console.log("Docker event stream ended");
  });
});

// Reverse Proxy - This server is responsible for routing the requests to the correct container
const reverseProxyPort = 80;
const reverseProxyApp = express();

reverseProxyApp.use((req, res) => {
  const hostname = req.hostname;
  const subDomain = hostname.split(".")[0];

  if (!db.has(subDomain)) {
    return res.status(404).send("Not found");
  }

  const { ipAddress, port } = db.get(subDomain);

  const target = `http://${ipAddress}:${port}`;

  console.log(`Forwarding ${hostname} --> ${target}`);

  return proxy.web(req, res, { target, changeOrigin: true, ws: true });
});

const reverseProxy = http.createServer(reverseProxyApp);

reverseProxy.on("upgrade", (req, socket, head) => {
  const hostname = req.headers.host;
  const subDomain = hostname.split(".")[0];

  if (!db.has(subDomain)) {
    return res.status(404).send("Not found");
  }

  const { ipAddress, port } = db.get(subDomain);

  const target = `http://${ipAddress}:${port}`;

  return proxy.ws(req, socket, head, { target, ws: true });
});

reverseProxy.listen(reverseProxyPort, () => {
  console.log(`Reverse proxy listening on port ${reverseProxyPort}`);
});

// Management API - This API is responsible for managing the containers
const managementAPI = express();
managementAPI.use(express.json());

const managementAPIPort = 8080;

managementAPI.post("/run", async (req, res) => {
  const { image, tag = "latest" } = req.body;

  const availableImages = await docker.listImages();

  const imageAlreadyExists = availableImages.some((availableImage) => {
    return availableImage.RepoTags.includes(`${image}:${tag}`);
  });

  if (!imageAlreadyExists) {
    console.log(`Pulling ${image}:${tag}`);
    await docker.pull(`${image}:${tag}`);
  } else {
    console.log(`Image ${image}:${tag} already exists`);
  }

  const container = await docker.createContainer({
    Image: `${image}:${tag}`,
    Tty: false,
    HostConfig: {
      AutoRemove: true,
    },
  });

  await container.start();

  const containerName = (await container.inspect()).Name.substring(1);

  return res.json({
    message: "Container started",
    container: containerName,
    image: `${image}:${tag}`,
    url: `http://${containerName}.localhost:80/`,
  });
});

managementAPI.listen(managementAPIPort, () => {
  console.log(`Management API listening on port ${managementAPIPort}`);
});
