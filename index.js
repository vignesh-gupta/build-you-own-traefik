// Express server

const Docker = require("dockerode");
const express = require("express");

const docker = new Docker();

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
  }else{
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

  return res.json({
    message: "Container started",
    container: (await container.inspect()).Name,
    image: `${image}:${tag}`,
  });
});

managementAPI.listen(managementAPIPort, () => {
  console.log(`Management API listening on port ${managementAPIPort}`);
});
