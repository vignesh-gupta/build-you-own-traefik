import express from "express";
import httpProxy from "http-proxy";
import http from "http";
import { hasInDb } from "./db.js";

const proxy = httpProxy.createProxy({});

export const reverseProxyServer = () => {
  // Reverse Proxy - This server is responsible for routing the requests to the correct container
  const reverseProxyPort = 80;
  const reverseProxyApp = express();

  const getTarget = (hostname) => {
    const subDomain = hostname.split(".")[0];

    if (hasInDb(subDomain)) {
      return null;
    }

    const { ipAddress, port } = db.get(subDomain);

    return `http://${ipAddress}:${port}`;
  };

  reverseProxyApp.use((req, res) => {
    const hostname = req.hostname;

    const target = getTarget(hostname);
    if (!target) return res.status(404).send("Not found");

    console.log(`Forwarding ${hostname} --> ${target}`);

    return proxy.web(req, res, { target, changeOrigin: true, ws: true });
  });

  const reverseProxy = http.createServer(reverseProxyApp);

  reverseProxy.on("upgrade", (req, socket, head) => {
    const hostname = req.headers.host;

    const target = getTarget(hostname);
    if (!target) return res.status(404).send("Not found");

    return proxy.ws(req, socket, head, { target, ws: true });
  });

  reverseProxy.listen(reverseProxyPort, () => {
    console.log(`Reverse proxy listening on port ${reverseProxyPort}`);
  });
};
