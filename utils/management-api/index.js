import express from "express";
import { docker } from "../docker-events.js";
import { getAllFromDb } from "../db.js";

export const managementAPIServer = async () => {
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

  managementAPI.get("/containers", async (req, res) => {
    const containers = getAllFromDb();

    return res.json(containers);
  });

  managementAPI.listen(managementAPIPort, () => {
    console.log(`Management API listening on port ${managementAPIPort}`);
  });
};
