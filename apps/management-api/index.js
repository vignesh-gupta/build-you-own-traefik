import express from "express";
import { containerRouter } from "./controllers/container.js";

export const managementAPIServer = async () => {
  const managementAPI = express();
  managementAPI.use(express.json());

  const managementAPIPort = 8080;

  managementAPI.use("/containers", containerRouter);

  managementAPI.listen(managementAPIPort, () => {
    console.log(`Management API listening on port ${managementAPIPort}`);
  });
};
