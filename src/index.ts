import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { getSession } from "./repository";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/devices/mac/:mac", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const macAddress = req.params.mac;
    const result = await session.run(
      "MATCH (device:Device { mac: $macAddress }) RETURN device",
      { macAddress },
    );
    const device = result.records.map(
      (record) => record.get("device").properties,
    );
    res.json(device[0]);
  } catch (error) {
    res.status(500).send("Error retrieving device by MAC address");
  } finally {
    await session.close();
  }
});

app.post("/devices", async (req, res) => {
  const session = getSession();
  try {
    const { name, mac, ip, type, locationName, routerMac } = req.body;
    const result = await session.run(
      `
      MATCH (location:Location { name: $locationName })
      MATCH (router:Device { mac: $routerMac })
      CREATE (device:Device { name: $name, mac: $mac, ip: $ip, type: $type })
      MERGE (device)-[:LOCATED_IN]->(location)
      MERGE (device)-[:CONNECTED_TO]->(router)
      RETURN device, location, router
    `,
      { name, mac, ip, type, locationName, routerMac },
    );

    const createdDevice = result.records.map((record) => {
      return {
        device: record.get("device").properties,
        location: record.get("location").properties,
        router: record.get("router").properties,
      };
    });

    res.json(createdDevice[0]);
  } catch (error) {
    res.status(500).send("Error creating device");
  } finally {
    await session.close();
  }
});

app.post("/locations", async (req, res) => {
  const session = getSession();
  try {
    const { name, address } = req.body;
    const result = await session.run(
      `CREATE (l:Location { name: $name, address: $address }) RETURN l`,
      { name, address },
    );

    const createdLocation = result.records.map((record) => {
      return {
        location: record.get("l").properties,
      };
    });

    res.json(createdLocation[0]);
  } catch (error) {
    res.status(500).send("Error creating the new location");
  } finally {
    await session.close();
  }
});

app.get(
  "/devices/location/:locationName",
  async (req: Request, res: Response) => {
    const session = getSession();
    try {
      const locationName = req.params.locationName;
      const result = await session.run(
        "MATCH (device:Device)-[:LOCATED_IN]->(location:Location { name: $locationName }) RETURN device",
        { locationName },
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
  },
);

app.get("/devices/hops/:deviceName", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const deviceName = req.params.deviceName;
    const result = await session.run(
      `
      MATCH path = (startDevice:Device { name: $deviceName })-[:CONNECTED_TO*..10]-(endDevice:Device)
      WHERE startDevice <> endDevice
      RETURN endDevice AS ConnectedDevice, LENGTH(path) AS NumberOfHops
    `,
      { deviceName },
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

app.get(
  "/devices/path/:startDevice/:endDevice",
  async (req: Request, res: Response) => {
    const session = getSession();
    try {
      const startDevice = req.params.startDevice;
      const endDevice = req.params.endDevice;

      const result = await session.run(
        `
        MATCH (start:Device { mac: $startDevice })
        MATCH (end:Device { mac: $endDevice })
        MATCH path = shortestPath((start)-[rels:CONNECTED_TO*..10]-(end))
        RETURN path, reduce(totalLatency = 0, r in rels | totalLatency + r.latency_ms) AS totalLatency
    `,
        { startDevice, endDevice },
      );

      const paths = result.records.map((record) => ({
        path: record
          .get("path")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .segments.map((segment: any) => ({
            start: {
              name: segment.start.properties.name,
              ip: segment.start.properties.ip,
            },
            end: {
              name: segment.end.properties.name,
              ip: segment.end.properties.ip,
            },
          })),
        latency: record.get("totalLatency").toInt(),
      }));

      res.json(paths);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error finding path with least total latency");
    } finally {
      await session.close();
    }
  },
);

app.get("/devices/count/:locationName", async (req: Request, res: Response) => {
  const session = getSession();
  try {
    const locationName = req.params.locationName;
    const result = await session.run(
      `
      MATCH (d:Device)-[:LOCATED_IN]->(l:Location { name: $locationName })
      RETURN COUNT(d) AS NumberOfDevices
    `,
      { locationName },
    );
    const numberOfDevices = result.records[0].get("NumberOfDevices").toInt();
    res.json({ location: locationName, count: numberOfDevices });
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
