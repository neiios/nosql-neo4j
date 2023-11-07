import express from 'express';
import dotenv from 'dotenv';
import { getSession } from './repository';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/devices', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run('MATCH (d:Device) RETURN d');
    const devices = result.records.map(record => record.get('d').properties);
    res.json(devices);
  } catch (error) {
    res.status(500).send('Error retrieving devices');
  } finally {
    await session.close();
  }
});

app.get('/subnets', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run('MATCH (s:Subnet) RETURN s');
    const subnets = result.records.map(record => record.get('s').properties);
    res.json(subnets);
  } catch (error) {
    res.status(500).send('Error retrieving subnets');
  } finally {
    await session.close();
  }
});

app.get('/locations', async (req, res) => {
  const session = getSession();
  try {
    const result = await session.run('MATCH (l:Location) RETURN l');
    const locations = result.records.map(record => record.get('l').properties);
    res.json(locations);
  } catch (error) {
    res.status(500).send('Error retrieving locations');
  } finally {
    await session.close();
  }
});

app.get('/devices/:ip', async (req, res) => {
  const session = getSession();
  try {
    const ip = req.params.ip;
    const result = await session.run('MATCH (d:Device {ip: $ip}) RETURN d', { ip });
    const device = result.records.map(record => record.get('d').properties);
    if (device.length) {
      res.json(device[0]);
    } else {
      res.status(404).send('Device not found');
    }
  } catch (error) {
    res.status(500).send('Error retrieving the device');
  } finally {
    await session.close();
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
