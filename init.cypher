// Create Device nodes
CREATE (d1:Device { name: 'Laptop', ip: '192.168.1.10', mac: 'AA:BB:CC:DD:EE:01', status: 'active' }),
       (d2:Device { name: 'Server', ip: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:02', status: 'active' }),
       (d3:Device { name: 'Router', ip: '192.168.1.1', mac: 'AA:BB:CC:DD:EE:03', status: 'active' });

// Create Subnet nodes
CREATE (s1:Subnet { cidr: '192.168.1.0/24' }),
       (s2:Subnet { cidr: '192.168.2.0/24' });

// Create Location nodes
CREATE (l1:Location { name: 'Headquarters', address: '123 Main St' }),
       (l2:Location { name: 'Data Center', address: '456 Elm St' });

// Create relationships for devices in subnets
CREATE (d1)-[:PART_OF]->(s1),
       (d2)-[:PART_OF]->(s1),
       (d3)-[:PART_OF]->(s1);

// Create relationships for devices in locations
CREATE (d1)-[:LOCATED_IN]->(l1),
       (d2)-[:LOCATED_IN]->(l2),
       (d3)-[:LOCATED_IN]->(l1);

// Create connections between devices
CREATE (d1)-[:CONNECTED_TO { type: 'Wifi' }]->(d3),
       (d2)-[:CONNECTED_TO { type: 'Ethernet' }]->(d3);

// Create a unique constraint on the 'ip' property for Device nodes
CREATE CONSTRAINT unique_device_ip FOR (d:Device) REQUIRE d.ip IS UNIQUE;

// Create a unique constraint on the 'mac' property for Device nodes
CREATE CONSTRAINT unique_device_mac FOR (d:Device) REQUIRE d.mac IS UNIQUE;

