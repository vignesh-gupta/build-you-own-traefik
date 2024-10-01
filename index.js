import { dockerEventListeners } from "./apps/docker-events.js";
import { managementAPIServer } from "./apps/management-api/index.js";
import { reverseProxyServer } from "./apps/reverse-proxy-server.js";

// Docker Events
dockerEventListeners();

// Reverse Proxy Server - This server is responsible for routing the requests to the correct container
reverseProxyServer();

// Management API - This API is responsible for managing the containers
managementAPIServer();
