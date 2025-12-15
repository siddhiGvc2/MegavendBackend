const { mqttEvents } = require('./mqtt');
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

  orders[txn_id].status = 'SUCCESS';
  console.log(`Order ${txn_id} updated to SUCCESS`);

 
  console.log(`Order ${txn_id} SUCCESS`);
});
