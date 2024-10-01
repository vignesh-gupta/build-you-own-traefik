import { Router } from "express";
import { docker } from "../../docker-events.js";
import { getAllFromDb, getFromDb } from "../../db.js";

export const containerRouter = Router();

containerRouter.post("/run", async (req, res) => {
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

containerRouter.post("/stop", async (req, res) => {
  try {
    const { container } = req.body;

    const containerInfo = getFromDb(container);

    if (!containerInfo || !containerInfo.id)
      return res.status(404).json({
        message: "Container not found",
        container,
      });

    const containerInstance = docker.getContainer(containerInfo.id);
    await containerInstance.stop();

    return res.json({
      message: "Container stopped",
      container,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ message: "Internal server error" });
  }
});

containerRouter.get("/list", async (_, res) => {
  const containers = getAllFromDb();

  return res.json(
    containers.map((container) => ({
      container: container.name,
      url: container.url,
      image: container.image,
    }))
  );
});
