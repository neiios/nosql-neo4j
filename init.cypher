MATCH (n) DETACH DELETE n;

CREATE
  // Router nodes with 'type' property
  (router1:Device { name: 'Router1', type: 'Router', ip: '192.168.1.1', subnet: '192.168.1.0/24', mac: 'AA:BB:CC:DD:EE:01' }),
  (router2:Device { name: 'Router2', type: 'Router', ip: '192.168.2.1', subnet: '192.168.2.0/24', mac: 'AA:BB:CC:DD:EE:02' }),
  (router3:Device { name: 'Router3', type: 'Router', ip: '192.168.3.1', subnet: '192.168.3.0/24', mac: 'AA:BB:CC:DD:EE:03' }),

  // Existing device nodes
  (d1:Device { name: 'Laptop', type: 'Workstation', ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:04' }),
  (d2:Device { name: 'Nextcloud', type: 'Server', ip: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:05' }),
  (d3:Device { name: 'Printer', type: 'Other', ip: '192.168.2.30', mac: 'AA:BB:CC:DD:EE:06' }),
  (d4:Device { name: 'Jellyfin', type: 'Server', ip: '192.168.2.40', mac: 'AA:BB:CC:DD:EE:07' }),
  (d5:Device { name: 'NAS', type: 'Server', ip: '192.168.3.50', mac: 'AA:BB:CC:DD:EE:08' }),
  (d6:Device { name: 'Desktop', type: 'Workstation', ip: '192.168.1.30', mac: 'AA:BB:CC:DD:EE:09' }),

  // Location nodes
  (l1:Location { name: 'Headquarters', address: '721 Fifth Avenue Manhattan, New York' }),
  (l2:Location { name: 'Data Center', address: '1000 Colonial Farm Road, Langley, Fairfax County, Virginia' }),
  (l3:Location { name: 'Remote Office', address: 'Little Saint James' }),

  // User nodes
  (u1:User { name: 'Alice' }),
  (u2:User { name: 'Bob' }),

  // Relationships for devices in locations
  (router1)-[:LOCATED_IN]->(l1),
  (d1)-[:LOCATED_IN]->(l1),
  (d2)-[:LOCATED_IN]->(l1),
  (d6)-[:LOCATED_IN]->(l1),
  (router2)-[:LOCATED_IN]->(l2),
  (d4)-[:LOCATED_IN]->(l2),
  (d5)-[:LOCATED_IN]->(l2),
  (router3)-[:LOCATED_IN]->(l3),
  (d3)-[:LOCATED_IN]->(l3),

  // Relationships for users accessing devices
  (u1)-[:ACCESSES]->(d1),
  (u2)-[:ACCESSES]->(d6),

  // Connections between devices and routers within the same location
  (d1)-[:CONNECTED_TO { type: 'Wifi', bandwidth_mbps: 100, latency_ms: 5, packet_loss: '0.1%' }]->(router1),
  (d2)-[:CONNECTED_TO { type: 'Wired', bandwidth_mbps: 1000, latency_ms: 1, packet_loss: '0%' }]->(router1),
  (d6)-[:CONNECTED_TO { type: 'Wifi', bandwidth_mbps: 100, latency_ms: 5, packet_loss: '0.1%' }]->(router1),
  (d4)-[:CONNECTED_TO { type: 'Wired', bandwidth_mbps: 100, latency_ms: 10, packet_loss: '0.2%' }]->(router2),
  (d5)-[:CONNECTED_TO { type: 'Wired', bandwidth_mbps: 200, latency_ms: 8, packet_loss: '0.1%' }]->(router2),
  (d3)-[:CONNECTED_TO { type: 'Wired', bandwidth_mbps: 100, latency_ms: 10, packet_loss: '0.2%' }]->(router3),

  // Connection between the routers
  (router1)-[:CONNECTED_TO { type: 'Fiber', bandwidth_mbps: 10000, latency_ms: 2, packet_loss: '0.05%' }]->(router2),
  (router2)-[:CONNECTED_TO { type: 'Coax', bandwidth_mbps: 10, latency_ms: 150, packet_loss: '20%' }]->(router3);

CREATE CONSTRAINT unique_device_mac IF NOT EXISTS FOR (d:Device) REQUIRE d.mac IS UNIQUE;
CREATE CONSTRAINT unique_location_address IF NOT EXISTS FOR (l:Location) REQUIRE l.address IS UNIQUE; 
CREATE CONSTRAINT unique_name IF NOT EXISTS FOR (l:Location) REQUIRE l.name IS UNIQUE; 
