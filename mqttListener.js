const { mqttEvents, sendMessage } = require('./mqtt');
const orders = require('./orderStore');

mqttEvents.on('message', (topic, message) => {
  console.log('MQTT RX:', topic, message);

  // *machineId,txnId,amount#
  if (!message.startsWith('*') || !message.endsWith('#')) return;

  const payload = message.slice(1, -1);
  const [machineId, txn_id, amountReceived] = payload.split(',');
  console.log('Parsed MQTT message:', { machineId, txn_id, amountReceived });
  console.log('Current', orders);
  if (!orders[txn_id]) return;
  if(orders[txn_id].status === 'SUCCESS') return;

  orders[txn_id].status = 'SUCCESS';
  console.log(`Order ${txn_id} updated to SUCCESS`);
//   console.log('Updated Order:', orders[txn_id]);
  sendMessage(`HB/${machineId}`, `*SUCCESS#`);
  const kbd1 = `${orders[txn_id].items[0].x}${orders[txn_id].items[0].y}`;
  const kbd2 = `${orders[txn_id].items[1].x}${orders[txn_id].items[1].y}`;
  const kbd3 = `${orders[txn_id].items[2].x}${orders[txn_id].items[2].y}`;
  const kbd4 = `${orders[txn_id].items[3].x}${orders[txn_id].items[3].y}`;
  sendMessage(`HB/${machineId}`, `*KBDK${txn_id},${kbd1},${kbd2},${kbd3},${kbd4}#`);
});
