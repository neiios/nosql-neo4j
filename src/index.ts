import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { getSession } from "./repository";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// get a device by its mac address
app.get("/devices/:mac", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const macAddress = req.params.mac;

    const result = await session.run(
      "MATCH (device:Device { mac: $macAddress }) RETURN device",
      { macAddress },
    );

    res.json(result.records[0].get("device").properties);
  } catch (error) {
    res.status(500).send("Error retrieving device by MAC address");
  } finally {
    await session.close();
  }
});

// add a new device (need to specify connection)
app.post("/devices", async (req, res) => {
  const session = getSession();
  try {
    const {
      name,
      mac,
      ip,
      type,
      locationName,
      routerMac,
      connectionType,
      bandwidthMbps,
      latencyMs,
      packetLoss,
    } = req.body;
    const result = await session.executeWrite((tx) =>
      tx.run(
        `
      MATCH (location:Location { name: $locationName })
      MATCH (router:Device { mac: $routerMac, type: "Router" })-[:LOCATED_IN]->(location)
      CREATE (device:Device { name: $name, mac: $mac, ip: $ip, type: $type })
      MERGE (device)-[:LOCATED_IN]->(location)
      MERGE (device)-[:CONNECTED_TO {
        type: $connectionType, 
        bandwidth_mbps: $bandwidthMbps, 
        latency_ms: $latencyMs, 
        packet_loss: $packetLoss
      }]->(router)
      RETURN device, router {.name, .mac, .subnet, .ip}
    `,
        {
          name,
          mac,
          ip,
          type,
          locationName,
          routerMac,
          connectionType,
          bandwidthMbps,
          latencyMs,
          packetLoss,
        },
      ),
    );

    const createdDevice = result.records.map((record) => {
      return {
        device: record.get("device").properties,
        router: record.get("router"),
      };
    });

    res.json(createdDevice[0]);
  } catch (error) {
    res.status(500).send("Error creating device");
  } finally {
    await session.close();
  }
});

// add a new location
app.post("/locations", async (req, res) => {
  const session = getSession();
  try {
    const { name, address } = req.body;

    const result = await session.run(
      `CREATE (location:Location { name: $name, address: $address }) RETURN location {.name, .address}`,
      { name, address },
    );

    res.json(result.records[0].get("location"));
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating the new location");
  } finally {
    await session.close();
  }
});

// add a new user
app.post("/users", async (req, res) => {
  const session = getSession();
  try {
    const { name, email } = req.body;

    const result = await session.run(
      `CREATE (user:User { name: $name, email: $email }) RETURN user {.name, .email}`,
      { name, email },
    );

    return res.json(result.records[0].get("user"));
  } catch (error) {
    res.status(500).send("Error creating the new user");
  } finally {
    await session.close();
  }
});

// finds all devices a user has access to
app.get("/users/:email/devices", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const email = req.params.email;

    const result = await session.run(
      `
      MATCH (user:User { email: $email })-[:ACCESSES]->(device:Device)
      RETURN device
    `,
      { email },
    );

    const devices = result.records.map(
      (record) => record.get("device").properties,
    );

    res.json(devices);
  } catch (error) {
    res.status(500).send("Error retrieving devices accessed by a user");
  } finally {
    await session.close();
  }
});

// finds all devices in a specific location
app.get("/locations/:codename/devices", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const codename = req.params.codename;

    const result = await session.run(
      "MATCH (device:Device)-[:LOCATED_IN]->(location:Location { name: $codename }) RETURN device",
      { codename },
    );

    const devices = result.records.map(
      (record) => record.get("device").properties,
    );

    res.json(devices);
  } catch (error) {
    res.status(500).send("Error retrieving devices in a specific location");
  } finally {
    await session.close();
  }
});

// finds a number of hops from a device to all other devices
app.get("/hops/:device", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const device = req.params.device;

    const result = await session.run(
      `
      MATCH path = (startDevice:Device { mac: $device })-[:CONNECTED_TO*..10]-(endDevice:Device)
      WHERE startDevice <> endDevice
      RETURN endDevice AS ConnectedDevice, LENGTH(path) AS NumberOfHops
    `,
      { device },
    );

    const connectedDevices = result.records.map((record) => ({
      connectedDevice: record.get("ConnectedDevice").properties,
      numberOfHops: record.get("NumberOfHops").toInt(),
    }));

    res.json(connectedDevices);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving connected devices");
  } finally {
    await session.close();
  }
});

// finds the shortest path (using latency as weight) from a device to another device
app.get("/dijkstra/:startDevice/:endDevice", async (req, res) => {
  const session = getSession();
  try {
    const startDevice = req.params.startDevice;
    const endDevice = req.params.endDevice;

    const result = await session.run(
      `
        MATCH (start:Device { mac: $startDevice }), (end:Device { mac: $endDevice })
        CALL apoc.algo.dijkstra(start, end, 'CONNECTED_TO', 'latency_ms') 
        YIELD path, weight
        RETURN [node in nodes(path) | node {.name, .mac, .ip}] AS path, weight AS totalLatency
        `,
      { startDevice, endDevice },
    );

    if (result.records.length === 0) {
      return res.status(404).send("No path found");
    }

    const path = result.records[0].get("path");
    const totalLatency = result.records[0].get("totalLatency");

    res.json({ totalLatency, path });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error finding path with least total latency");
  } finally {
    await session.close();
  }
});

// gets the count of devices in a location
app.get("/locations/:codename/count", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const codename = req.params.codename;

    const result = await session.run(
      `
      MATCH (d:Device)-[:LOCATED_IN]->(l:Location { codename: $codename })
      RETURN COUNT(d) AS NumberOfDevices
    `,
      { codename },
    );

    const numberOfDevices = result.records[0].get("NumberOfDevices").toInt();

    res.json({ location: codename, numberOfConnectedDevices: numberOfDevices });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error counting devices in the specified location");
  } finally {
    await session.close();
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
