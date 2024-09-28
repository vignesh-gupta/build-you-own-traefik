import { dockerEventListeners } from "./utils/docker-events.js";
import { managementAPIServer } from "./utils/management-api/index.js";
import { reverseProxyServer } from "./utils/reverse-proxy-server.js";

// Docker Events
dockerEventListeners();

// Reverse Proxy Server - This server is responsible for routing the requests to the correct container
reverseProxyServer();

// Management API - This API is responsible for managing the containers
managementAPIServer();
